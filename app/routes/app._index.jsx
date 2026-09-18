import { useLoaderData, useFetcher, Link } from "react-router";
import { useEffect, useState } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { PLAN } from "../plans.js";
import { C } from "../colors.js";
import prisma from "../db.server.js";
import {
  gqlData,
  fetchCollectionAvailability,
  reorderCollection,
} from "../cron.server.js";
import { buildStableGroups, computeReorderMoves } from "../sorting.server.js";

const COLLECTION_LIST_QUERY = `
  query DashboardCollections($cursor: String) {
    collections(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          sortOrder
          productsCount { count }
        }
      }
    }
  }
`;

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const shopRow = await prisma.shop.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });

  // Pull the live collection list + sync compatibility/title/sortOrder into
  // ManagedCollection. This IS the "compatibility scan" — it runs every time
  // the dashboard loads, so a sort-mode change made outside our webhooks
  // (e.g. before the app was installed) is still caught.
  const data = await gqlData(admin, COLLECTION_LIST_QUERY, { cursor: null });
  const nodes = data.collections?.edges.map((e) => e.node) || [];

  const managed = await Promise.all(
    nodes.map((node) =>
      prisma.managedCollection.upsert({
        where: { shop_shopifyCollectionId: { shop, shopifyCollectionId: node.id } },
        create: {
          shop,
          shopifyCollectionId: node.id,
          title: node.title,
          sortOrder: node.sortOrder,
        },
        update: {
          title: node.title,
          sortOrder: node.sortOrder,
          // A collection that just left MANUAL sort can't stay enabled.
          enabled: undefined, // set below only when it needs to flip off
        },
      }),
    ),
  );

  // Second pass: force-disable anything that's no longer MANUAL but is
  // still marked enabled (Prisma can't conditionally skip a field in the
  // same upsert without extra round-trips, so this stays a plain follow-up).
  for (const row of managed) {
    if (row.sortOrder !== "MANUAL" && row.enabled) {
      await prisma.managedCollection.update({ where: { id: row.id }, data: { enabled: false } });
      row.enabled = false;
    }
  }

  const productsCountByCollection = Object.fromEntries(
    nodes.map((n) => [n.id, n.productsCount?.count ?? 0]),
  );

  const collections = managed
    .map((row) => ({
      id: row.shopifyCollectionId,
      title: row.title,
      sortOrder: row.sortOrder,
      compatible: row.sortOrder === "MANUAL",
      enabled: row.enabled,
      productCount: productsCountByCollection[row.shopifyCollectionId] ?? 0,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const recentActivity = await prisma.activityLog.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const now = new Date();
  const inTrial = shopRow.trialEndsAt && shopRow.trialEndsAt > now;

  return {
    shop,
    isActive: shopRow.isActive,
    inTrial,
    collections,
    recentActivity,
    over50: collections.reduce((sum, c) => sum + c.productCount, 0) > 50,
  };
};

export const action = async ({ request }) => {
  let session, admin;
  try {
    ({ session, admin } = await authenticate.admin(request));
  } catch (e) {
    if (e instanceof Response) throw e;
    return { error: "Auth failed: " + e.message };
  }
  const shop = session.shop;
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "subscribe") {
    try {
      const resp = await admin.graphql(
        `mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!, $test: Boolean, $trialDays: Int) {
          appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: $test, trialDays: $trialDays) {
            appSubscription { id }
            confirmationUrl
            userErrors { field message }
          }
        }`,
        {
          variables: {
            name: PLAN.label,
            returnUrl: `${process.env.SHOPIFY_APP_URL}/billing/callback?shop=${shop}`,
            test: process.env.BILLING_TEST !== "false",
            trialDays: PLAN.trialDays,
            lineItems: [{
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: PLAN.amount, currencyCode: PLAN.currencyCode },
                  interval: PLAN.interval,
                },
              },
            }],
          },
        },
      );
      const data = await resp.json();
      const sub = data.data?.appSubscriptionCreate;
      if (sub?.userErrors?.length) return { error: sub.userErrors[0].message };
      if (!sub?.confirmationUrl) return { error: "Failed to start subscription" };
      // Return the URL as JSON — a native <form target="_top"> here gets
      // silently swallowed by Shopify admin's iframe sandbox (no top-level
      // navigation, no error, nothing reaches the server at all). The
      // supported way to break out is client-side: window.top.location.href
      // from a normal in-iframe fetch, which is what CODsafe already does.
      return { billingUrl: sub.confirmationUrl };
    } catch (e) {
      if (e instanceof Response) throw e;
      return { error: "Billing error: " + e.message };
    }
  }

  if (intent === "cancel_subscription") {
    try {
      const subsResp = await admin.graphql(
        `query ActiveSubscriptions {
          currentAppInstallation {
            activeSubscriptions { id }
          }
        }`,
      );
      const subsData = await subsResp.json();
      const activeSubscriptions = subsData.data?.currentAppInstallation?.activeSubscriptions || [];

      for (const sub of activeSubscriptions) {
        const cancelResp = await admin.graphql(
          `mutation AppSubscriptionCancel($id: ID!) {
            appSubscriptionCancel(id: $id) {
              appSubscription { id status }
              userErrors { field message }
            }
          }`,
          { variables: { id: sub.id } },
        );
        const cancelData = await cancelResp.json();
        const userErrors = cancelData.data?.appSubscriptionCancel?.userErrors;
        if (userErrors?.length) return { error: userErrors[0].message };
      }

      // Disable every collection too — an unsubscribed shop shouldn't keep
      // getting live reorders (webhooks would otherwise still process them).
      await prisma.$transaction([
        prisma.shop.update({ where: { shop }, data: { isActive: false, subscriptionId: null } }),
        prisma.managedCollection.updateMany({ where: { shop }, data: { enabled: false } }),
      ]);
      return { success: true };
    } catch (e) {
      if (e instanceof Response) throw e;
      return { error: "Cancel failed: " + e.message };
    }
  }

  if (intent === "toggle_collection") {
    const shopifyCollectionId = form.get("collectionId");
    const enable = form.get("enable") === "true";

    const row = await prisma.managedCollection.findUnique({
      where: { shop_shopifyCollectionId: { shop, shopifyCollectionId } },
    });
    if (!row) return { error: "Unknown collection" };
    if (enable && row.sortOrder !== "MANUAL") {
      return { error: "This collection isn't set to Manual sorting, so DownStock can't manage it." };
    }

    if (!enable) {
      await prisma.managedCollection.update({ where: { id: row.id }, data: { enabled: false } });
      return { success: true };
    }

    // Enabling: run the initial scan right now so the merchant sees a result
    // immediately, instead of waiting for the next webhook.
    try {
      const { ids, soldOut, sortOrder } = await fetchCollectionAvailability(admin, shopifyCollectionId);
      if (sortOrder !== "MANUAL") {
        await prisma.managedCollection.update({ where: { id: row.id }, data: { sortOrder, enabled: false } });
        return { error: "Collection sort mode changed — no longer Manual sort." };
      }

      const desired = buildStableGroups(ids, soldOut);
      const moves = computeReorderMoves(ids, desired);
      if (moves.length > 0) await reorderCollection(admin, shopifyCollectionId, moves);

      const now = new Date();
      await prisma.$transaction([
        prisma.managedCollection.update({
          where: { id: row.id },
          data: { enabled: true, lastSyncedAt: now },
        }),
        ...ids.map((id) =>
          prisma.productAvailability.upsert({
            where: { shop_shopifyProductId: { shop, shopifyProductId: id } },
            create: { shop, shopifyProductId: id, isSoldOut: soldOut.has(id), lastCheckedAt: now },
            update: { isSoldOut: soldOut.has(id), lastCheckedAt: now },
          }),
        ),
      ]);

      for (const id of ids) {
        if (!soldOut.has(id)) continue;
        const idx = ids.indexOf(id);
        await prisma.productPosition.upsert({
          where: {
            shop_shopifyCollectionId_shopifyProductId: { shop, shopifyCollectionId, shopifyProductId: id },
          },
          create: {
            shop,
            shopifyCollectionId,
            shopifyProductId: id,
            originalPosition: idx,
            previousAnchorProductId: ids[idx - 1] || null,
            nextAnchorProductId: ids[idx + 1] || null,
            isMovedDown: true,
          },
          update: {},
        });
      }
      const movedCount = ids.filter((id) => soldOut.has(id)).length;
      if (movedCount > 0) {
        await prisma.activityLog.create({
          data: {
            shop,
            shopifyCollectionId,
            shopifyProductId: "bulk",
            productTitle: `${movedCount} sold-out product(s)`,
            type: "MOVED_DOWN",
          },
        });
      }
      return { success: true, movedCount };
    } catch (e) {
      return { error: "Scan failed: " + e.message };
    }
  }

  return null;
};

export default function Dashboard() {
  const { shop, isActive, inTrial, collections, recentActivity, over50 } = useLoaderData();
  const shopName = shop.replace(".myshopify.com", "");
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data?.billingUrl) {
      try { window.top.location.href = fetcher.data.billingUrl; }
      catch { window.location.href = fetcher.data.billingUrl; }
    }
  }, [fetcher.data]);

  const errorMessage = fetcher.data?.error;
  const subscribed = isActive || inTrial;
  const compatible = collections.filter((c) => c.compatible);
  const incompatible = collections.filter((c) => !c.compatible);

  return (
    <s-page heading="DownStock">
      {!subscribed && (
        <s-banner tone="info" title="Start your 14-day free trial">
          <s-paragraph>
            $1.99/month after the trial — one plan, everything included. No charge until day 15.
          </s-paragraph>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="subscribe" />
            <button
              type="submit"
              style={{
                marginTop: 8, padding: "8px 20px",
                background: C.btnBg, color: C.btnText,
                border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
              disabled={fetcher.state !== "idle"}
            >
              {fetcher.state !== "idle" ? "Redirecting…" : "Start free trial"}
            </button>
          </fetcher.Form>
        </s-banner>
      )}

      {errorMessage && (
        <s-banner tone="critical" title="Something went wrong">
          <s-paragraph>{errorMessage}</s-paragraph>
        </s-banner>
      )}

      {over50 && (
        <s-section heading="Built for growing catalogs">
          <s-paragraph style={{ color: C.textSecondary }}>
            DownStock has no product limit — it's a flat $1.99/mo whether you have 51 products or 5,000.
          </s-paragraph>
        </s-section>
      )}

      <s-section heading={`Manual-sort collections (${compatible.length})`}>
        {compatible.length === 0 ? (
          <div>
            <p style={{ color: C.textSecondary, marginBottom: 12 }}>
              DownStock only manages collections set to <strong>Manual</strong> sorting — that's a
              Shopify requirement, not a DownStock limit, and it means we'll never silently change
              how a collection is sorted for you.
            </p>
            <ol style={{ margin: "0 0 14px", paddingLeft: 18, color: C.text, fontSize: 13.5, lineHeight: 1.8 }}>
              <li>Open a collection in Shopify admin</li>
              <li>Set its <strong>Sort</strong> option to <strong>"Manual"</strong> and save</li>
              <li>Come back here and refresh — it'll show up below with an <strong>Enable</strong> button</li>
            </ol>
            <a
              href={`https://admin.shopify.com/store/${shopName}/collections`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block", padding: "8px 16px",
                background: C.btnBg, color: C.btnText,
                borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}
            >
              Open Collections in Shopify admin →
            </a>
          </div>
        ) : (
          <div>
            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 12 }}>
              Click <strong>Enable</strong> on a collection to scan it now and keep it sorted
              automatically from then on — available products first, sold-out ones pushed to the
              bottom, both groups keeping their existing order.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {compatible.map((c) => (
                <CollectionRow key={c.id} collection={c} subscribed={subscribed} fetcher={fetcher} />
              ))}
            </div>
          </div>
        )}
      </s-section>

      {incompatible.length > 0 && (
        <s-section heading={`Unsupported collections (${incompatible.length})`}>
          <p style={{ color: C.textSecondary, marginBottom: 10 }}>
            These collections use a sort order other than Manual, so DownStock can't safely reorder
            them — we never change a collection's sort mode for you.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {incompatible.map((c) => (
              <div key={c.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8,
              }}>
                <span>{c.title}</span>
                <span style={{ fontSize: 12, color: C.textCaution, fontWeight: 600 }}>
                  Sort: {c.sortOrder.replace(/_/g, " ").toLowerCase()} — needs Manual
                </span>
              </div>
            ))}
          </div>
        </s-section>
      )}

      <s-section heading="Recent activity">
        {recentActivity.length === 0 ? (
          <p style={{ color: C.textSecondary }}>
            Nothing moved yet — enable a collection above to run its first scan.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentActivity.map((a) => (
              <div key={a.id} style={{ fontSize: 13, color: C.text }}>
                <strong>{a.type === "MOVED_DOWN" ? "Moved down" : "Restored"}:</strong>{" "}
                {a.productTitle || a.shopifyProductId} —{" "}
                <span style={{ color: C.textSecondary }}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <Link to="/app/activity" style={{ color: C.textInteractive, fontSize: 14, textDecoration: "none" }}>
            View full activity log →
          </Link>
        </div>
      </s-section>

      {subscribed && (
        <s-section heading="Subscription">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{
                display: "inline-block", padding: "3px 10px",
                background: C.bgSuccess, color: C.textSuccess,
                borderRadius: 20, fontSize: 12, fontWeight: 600,
              }}>
                {inTrial && !isActive ? "Free trial" : "Active"}
              </span>
              <span style={{ marginLeft: 10, fontSize: 13, color: C.textSecondary }}>
                $1.99/month — cancel any time, no long-term commitment.
              </span>
            </div>
            <CancelSubscriptionControl fetcher={fetcher} />
          </div>
        </s-section>
      )}
    </s-page>
  );
}

function CollectionRow({ collection, subscribed, fetcher }) {
  const busy =
    fetcher.state !== "idle" && fetcher.formData?.get("collectionId") === collection.id;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8,
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{collection.title}</div>
        <div style={{ fontSize: 12, color: C.textSecondary }}>{collection.productCount} products</div>
      </div>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="toggle_collection" />
        <input type="hidden" name="collectionId" value={collection.id} />
        <input type="hidden" name="enable" value={(!collection.enabled).toString()} />
        <button
          type="submit"
          disabled={!subscribed || busy}
          style={{
            padding: "6px 16px",
            background: collection.enabled ? "transparent" : C.btnBg,
            color: collection.enabled ? C.textCritical : C.btnText,
            border: collection.enabled ? `1.5px solid ${C.borderCritical}` : "none",
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: subscribed ? "pointer" : "not-allowed",
            opacity: subscribed ? 1 : 0.5,
          }}
        >
          {busy ? "Working…" : collection.enabled ? "Disable" : "Enable"}
        </button>
      </fetcher.Form>
    </div>
  );
}

// Inline two-step confirm instead of window.confirm() — a native browser
// dialog inside Shopify's embedded iframe isn't reliable (can be blocked by
// the iframe sandbox on some setups) and doesn't match Shopify's own UI.
function CancelSubscriptionControl({ fetcher }) {
  const [confirming, setConfirming] = useState(false);
  const busy = fetcher.state !== "idle";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{
          padding: "8px 16px", background: "transparent",
          color: C.textCritical, border: `1px solid ${C.borderCritical}`,
          borderRadius: 8, fontSize: 13, cursor: "pointer",
        }}
      >
        Cancel Subscription
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: C.textCritical, fontWeight: 600 }}>
        Cancel and stop managing collections?
      </span>
      <fetcher.Form method="post" onSubmit={() => setConfirming(false)}>
        <input type="hidden" name="intent" value="cancel_subscription" />
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "8px 16px", background: C.textCritical, color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
      </fetcher.Form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        style={{
          padding: "8px 16px", background: "transparent",
          color: C.textSecondary, border: `1px solid ${C.border}`,
          borderRadius: 8, fontSize: 13, cursor: "pointer",
        }}
      >
        Never mind
      </button>
    </div>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
