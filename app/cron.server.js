import prisma from "./db.server.js";
import { claimDueJobs, markJobSucceeded, markJobFailed } from "./jobs.server.js";
import {
  isProductSoldOut,
  buildStableGroups,
  computeReorderMoves,
  resolveRestoreIndex,
} from "./sorting.server.js";

// Thin adapter so both the background poller's plain-fetch client and the
// real Shopify SDK's `admin` (from authenticate.admin(request)) can be used
// interchangeably by the functions below — both expose
// `.graphql(query, { variables }) -> Promise<Response>`.
export async function gqlData(admin, query, variables) {
  const resp = await admin.graphql(query, { variables });
  const json = await resp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

export async function getAdminForShop(shop) {
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    orderBy: { expires: "desc" },
  });
  if (!session?.accessToken) return null;
  const token = session.accessToken;
  return {
    graphql: (query, opts = {}) =>
      fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables: opts.variables }),
      }),
  };
}

async function fetchProductAvailability(admin, shopifyProductId) {
  const data = await gqlData(
    admin,
    `query ProductAvailability($id: ID!) {
      product(id: $id) { id availableForSale title }
    }`,
    { id: shopifyProductId },
  );
  return data.product;
}

export async function fetchCollectionProductIds(admin, shopifyCollectionId) {
  // Paginated — large collections are read 250 products at a time.
  const ids = [];
  let cursor = null;
  for (;;) {
    const data = await gqlData(
      admin,
      `query CollectionProducts($id: ID!, $cursor: String) {
        collection(id: $id) {
          sortOrder
          products(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges { node { id } }
          }
        }
      }`,
      { id: shopifyCollectionId, cursor },
    );
    const products = data.collection?.products;
    if (!products) return { ids, sortOrder: null };
    ids.push(...products.edges.map((e) => e.node.id));
    if (!products.pageInfo.hasNextPage) {
      return { ids, sortOrder: data.collection.sortOrder };
    }
    cursor = products.pageInfo.endCursor;
  }
}

export async function reorderCollection(admin, shopifyCollectionId, moves) {
  if (moves.length === 0) return;
  // Chunk into batches of 250 to stay well under mutation payload / rate limits.
  for (let i = 0; i < moves.length; i += 250) {
    const chunk = moves.slice(i, i + 250);
    const data = await gqlData(
      admin,
      `mutation ReorderProducts($id: ID!, $moves: [MoveInput!]!) {
        collectionReorderProducts(id: $id, moves: $moves) {
          job { id }
          userErrors { field message }
        }
      }`,
      { id: shopifyCollectionId, moves: chunk },
    );
    const errors = data.collectionReorderProducts?.userErrors;
    if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
  }
}

/**
 * Fetches availableForSale for every product in a collection in one batch
 * (used by the initial scan when a merchant enables a collection, and by
 * re-sync). Uses the same paginated products(first:250) connection, just
 * requesting availableForSale alongside the id.
 */
export async function fetchCollectionAvailability(admin, shopifyCollectionId) {
  const soldOut = new Set();
  const ids = [];
  let cursor = null;
  let sortOrder = null;
  for (;;) {
    const data = await gqlData(
      admin,
      `query CollectionAvailability($id: ID!, $cursor: String) {
        collection(id: $id) {
          sortOrder
          products(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges { node { id availableForSale } }
          }
        }
      }`,
      { id: shopifyCollectionId, cursor },
    );
    const products = data.collection?.products;
    if (!products) return { ids, soldOut, sortOrder: null };
    sortOrder = data.collection.sortOrder;
    for (const { node } of products.edges) {
      ids.push(node.id);
      if (!node.availableForSale) soldOut.add(node.id);
    }
    if (!products.pageInfo.hasNextPage) return { ids, soldOut, sortOrder };
    cursor = products.pageInfo.endCursor;
  }
}

/**
 * Handles one PRODUCT_AVAILABILITY_CHANGED job: re-checks the product's
 * current sellability against what we last recorded, and if it crossed the
 * AVAILABLE<->SOLD_OUT boundary, re-sorts every enabled collection that
 * contains it. Re-reads live Shopify state rather than trusting the webhook
 * payload, so duplicate/out-of-order webhooks are harmless — the job is
 * idempotent against whatever the current truth is when it runs.
 */
async function processProductAvailabilityChanged(shop, payload) {
  const admin = await getAdminForShop(shop);
  if (!admin) return; // app uninstalled / no offline session — nothing to do

  const product = await fetchProductAvailability(admin, payload.shopifyProductId);
  if (!product) return; // deleted since the job was queued

  const nowSoldOut = isProductSoldOut(product);
  const prev = await prisma.productAvailability.findUnique({
    where: { shop_shopifyProductId: { shop, shopifyProductId: product.id } },
  });
  const wasSoldOut = prev?.isSoldOut ?? false;

  await prisma.productAvailability.upsert({
    where: { shop_shopifyProductId: { shop, shopifyProductId: product.id } },
    create: { shop, shopifyProductId: product.id, isSoldOut: nowSoldOut },
    update: { isSoldOut: nowSoldOut, lastCheckedAt: new Date() },
  });

  if (wasSoldOut === nowSoldOut) return; // no state transition — nothing to reorder

  const collections = await prisma.managedCollection.findMany({
    where: { shop, enabled: true },
  });

  for (const col of collections) {
    // Re-check compatibility live: sort mode may have changed since we last synced.
    const { ids: currentOrderIds, sortOrder } = await fetchCollectionProductIds(
      admin,
      col.shopifyCollectionId,
    );
    if (sortOrder !== "MANUAL") {
      if (col.sortOrder !== sortOrder) {
        await prisma.managedCollection.update({
          where: { id: col.id },
          data: { sortOrder, enabled: false },
        });
      }
      continue;
    }
    if (!currentOrderIds.includes(product.id)) continue; // not in this collection

    // Everyone ELSE's steady-state order: partition into [available..., soldOut...]
    // preserving each group's existing relative order (item being transitioned
    // is excluded here so it doesn't fight its own anchor computation).
    const others = currentOrderIds.filter((id) => id !== product.id);
    const othersSoldOut = new Set(
      (
        await prisma.productAvailability.findMany({
          where: { shop, shopifyProductId: { in: others }, isSoldOut: true },
          select: { shopifyProductId: true },
        })
      ).map((r) => r.shopifyProductId),
    );
    const grouped = buildStableGroups(others, othersSoldOut);
    const available = grouped.filter((id) => !othersSoldOut.has(id));
    const soldOut = grouped.filter((id) => othersSoldOut.has(id));

    let desiredOrderIds;
    const prevPos = await prisma.productPosition.findUnique({
      where: {
        shop_shopifyCollectionId_shopifyProductId: {
          shop,
          shopifyCollectionId: col.shopifyCollectionId,
          shopifyProductId: product.id,
        },
      },
    });

    if (nowSoldOut) {
      // Newly sold out: goes to the very end, after every other sold-out product.
      desiredOrderIds = [...available, ...soldOut, product.id];
    } else {
      // Restocked: reinsert into the available group using the anchor-first
      // policy — after the saved previous neighbor if it still exists, else
      // before the saved next neighbor, else the clamped original index.
      const insertIdx = resolveRestoreIndex({
        currentOrderIds: available,
        previousAnchorProductId: prevPos?.previousAnchorProductId ?? null,
        nextAnchorProductId: prevPos?.nextAnchorProductId ?? null,
        originalPosition: prevPos?.originalPosition ?? available.length,
      });
      const nextAvailable = [...available];
      nextAvailable.splice(insertIdx, 0, product.id);
      desiredOrderIds = [...nextAvailable, ...soldOut];
    }

    const moves = computeReorderMoves(currentOrderIds, desiredOrderIds);
    if (moves.length === 0) continue;

    await reorderCollection(admin, col.shopifyCollectionId, moves);

    if (nowSoldOut) {
      const idx = currentOrderIds.indexOf(product.id);
      if (!prevPos) {
        await prisma.productPosition.create({
          data: {
            shop,
            shopifyCollectionId: col.shopifyCollectionId,
            shopifyProductId: product.id,
            originalPosition: idx,
            previousAnchorProductId: currentOrderIds[idx - 1] || null,
            nextAnchorProductId: currentOrderIds[idx + 1] || null,
            isMovedDown: true,
          },
        });
      }
      await prisma.activityLog.create({
        data: {
          shop,
          shopifyCollectionId: col.shopifyCollectionId,
          shopifyProductId: product.id,
          productTitle: product.title,
          type: "MOVED_DOWN",
        },
      });
    } else {
      await prisma.productPosition.updateMany({
        where: { shop, shopifyCollectionId: col.shopifyCollectionId, shopifyProductId: product.id },
        data: { isMovedDown: false, restoredAt: new Date() },
      });
      await prisma.activityLog.create({
        data: {
          shop,
          shopifyCollectionId: col.shopifyCollectionId,
          shopifyProductId: product.id,
          productTitle: product.title,
          type: "RESTORED",
        },
      });
    }
  }
}

const HANDLERS = {
  PRODUCT_AVAILABILITY_CHANGED: (shop, payload) =>
    processProductAvailabilityChanged(shop, payload),
};

export async function processJobQueue() {
  const jobs = await claimDueJobs(20);
  for (const job of jobs) {
    const handler = HANDLERS[job.type];
    if (!handler) {
      await markJobFailed(job.id, `Unknown job type: ${job.type}`, { retryable: false });
      continue;
    }
    try {
      await handler(job.shop, JSON.parse(job.payload));
      await markJobSucceeded(job.id);
    } catch (err) {
      console.error(`[jobs] ${job.type} failed for ${job.shop}:`, err.message);
      await markJobFailed(job.id, err);
    }
  }
  return jobs.length;
}
