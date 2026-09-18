var _a;
import { jsx, jsxs } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, useLoaderData, Meta, Links, Outlet, ScrollRestoration, Scripts, redirect, UNSAFE_withErrorBoundaryProps, useRouteError, useFetcher } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-react-router/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, boundary } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma = global.prismaGlobal ?? new PrismaClient();
const PLAN = {
  key: "downstock",
  label: "DownStock",
  amount: 1.99,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS",
  trialDays: 14
};
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July26,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.July26;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, reactRouterContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: reactRouterContext, url: request.url }),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const C = {
  // Success (green)
  textSuccess: "var(--p-color-text-success, #1a7a1e)",
  bgSuccess: "var(--p-color-bg-surface-success, #d4edda)",
  // Critical / Error (red)
  textCritical: "var(--p-color-text-critical, #d72c0d)",
  borderCritical: "var(--p-color-border-critical, #fc9090)",
  // Caution / Warning (amber)
  textCaution: "var(--p-color-text-caution, #b98900)",
  bgCaution: "var(--p-color-bg-surface-caution, #fff5cc)",
  // Neutral
  text: "var(--p-color-text, #202223)",
  textSecondary: "var(--p-color-text-secondary, #6d7175)",
  border: "var(--p-color-border, #e1e3e5)",
  textInteractive: "#274ed6",
  // Buttons — lime fill with dark ink text (lime is too light for white text)
  btnBg: "#c9f24e",
  btnText: "#0a0c12"
};
const FONTS = {
  googleFontsHref: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
};
const loader$6 = async () => {
  return {
    apiKey: process.env.SHOPIFY_API_KEY || ""
  };
};
const root = UNSAFE_withComponentProps(function App() {
  const {
    apiKey
  } = useLoaderData();
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width,initial-scale=1"
      }), /* @__PURE__ */ jsx("meta", {
        name: "shopify-api-key",
        content: apiKey
      }), /* @__PURE__ */ jsx("script", {
        src: "https://cdn.shopify.com/shopifycloud/app-bridge.js"
      }), /* @__PURE__ */ jsx("script", {
        src: "https://cdn.shopify.com/shopifycloud/polaris.js"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://cdn.shopify.com/"
      }), /* @__PURE__ */ jsx("link", {
        rel: "stylesheet",
        href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous"
      }), /* @__PURE__ */ jsx("link", {
        rel: "stylesheet",
        href: FONTS.googleFontsHref
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
async function enqueueJob({ shop, type, payload, dedupeKey, delayMs = 0 }) {
  const availableAt = new Date(Date.now() + delayMs);
  try {
    if (dedupeKey) {
      const existing = await prisma.job.findUnique({ where: { dedupeKey } });
      if (existing && ["pending", "retry"].includes(existing.status)) {
        return prisma.job.update({
          where: { id: existing.id },
          data: { availableAt, payload: JSON.stringify(payload) }
        });
      }
    }
    return await prisma.job.create({
      data: {
        shop,
        type,
        dedupeKey: dedupeKey || void 0,
        payload: JSON.stringify(payload),
        availableAt
      }
    });
  } catch (err) {
    if (err.code === "P2002") return null;
    throw err;
  }
}
async function cancelJobsForShop(shop) {
  return prisma.job.updateMany({
    where: { shop, status: { in: ["pending", "retry", "processing"] } },
    data: { status: "cancelled" }
  });
}
function buildStableGroups(currentOrderIds, soldOutIds) {
  const available = [];
  const soldOut = [];
  for (const id of currentOrderIds) {
    (soldOutIds.has(id) ? soldOut : available).push(id);
  }
  return [...available, ...soldOut];
}
function computeReorderMoves(currentOrderIds, desiredOrderIds) {
  const moves = [];
  desiredOrderIds.forEach((id, idx) => {
    if (currentOrderIds[idx] !== id) {
      moves.push({ id, newPosition: String(idx) });
    }
  });
  return moves;
}
async function gqlData(admin, query, variables) {
  const resp = await admin.graphql(query, { variables });
  const json = await resp.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}
async function reorderCollection(admin, shopifyCollectionId, moves) {
  var _a2;
  if (moves.length === 0) return;
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
      { id: shopifyCollectionId, moves: chunk }
    );
    const errors = (_a2 = data.collectionReorderProducts) == null ? void 0 : _a2.userErrors;
    if (errors == null ? void 0 : errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  }
}
async function fetchCollectionAvailability(admin, shopifyCollectionId) {
  var _a2;
  const soldOut = /* @__PURE__ */ new Set();
  const ids = [];
  let cursor = null;
  let sortOrder = null;
  for (; ; ) {
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
      { id: shopifyCollectionId, cursor }
    );
    const products = (_a2 = data.collection) == null ? void 0 : _a2.products;
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
const action$6 = async ({
  request
}) => {
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const {
    shop,
    topic,
    payload,
    admin
  } = await authenticate.webhook(request);
  if (webhookId) {
    try {
      await prisma.webhookReceipt.create({
        data: {
          shop,
          webhookId,
          topic
        }
      });
    } catch (err) {
      if (err.code === "P2002") return new Response();
      throw err;
    }
  }
  try {
    const shopifyCollectionId = `gid://shopify/Collection/${payload.id}`;
    const existing = await prisma.managedCollection.findUnique({
      where: {
        shop_shopifyCollectionId: {
          shop,
          shopifyCollectionId
        }
      }
    });
    if (!existing) return new Response();
    const data = await gqlData(admin, `query CollectionMeta($id: ID!) {
        collection(id: $id) { title sortOrder }
      }`, {
      id: shopifyCollectionId
    });
    const meta = data.collection;
    if (!meta) return new Response();
    await prisma.managedCollection.update({
      where: {
        id: existing.id
      },
      data: {
        title: meta.title,
        sortOrder: meta.sortOrder,
        // Sort mode changed away from MANUAL: disable, don't fight the merchant.
        enabled: existing.enabled && meta.sortOrder === "MANUAL"
      }
    });
  } catch (err) {
    console.error(`[webhooks/collections/update] ${shop}:`, err.message);
  }
  return new Response();
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6
}, Symbol.toStringTag, { value: "Module" }));
const action$5 = async ({
  request
}) => {
  var _a2, _b, _c;
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const {
    shop,
    topic,
    payload,
    admin
  } = await authenticate.webhook(request);
  if (webhookId) {
    try {
      await prisma.webhookReceipt.create({
        data: {
          shop,
          webhookId,
          topic
        }
      });
    } catch (err) {
      if (err.code === "P2002") return new Response();
      throw err;
    }
  }
  try {
    const inventoryItemGid = `gid://shopify/InventoryItem/${payload.inventory_item_id}`;
    const data = await gqlData(admin, `query ItemProduct($id: ID!) {
        inventoryItem(id: $id) { variant { product { id } } }
      }`, {
      id: inventoryItemGid
    });
    const shopifyProductId = (_c = (_b = (_a2 = data.inventoryItem) == null ? void 0 : _a2.variant) == null ? void 0 : _b.product) == null ? void 0 : _c.id;
    if (!shopifyProductId) return new Response();
    await enqueueJob({
      shop,
      type: "PRODUCT_AVAILABILITY_CHANGED",
      payload: {
        shopifyProductId
      },
      dedupeKey: `${shop}:${shopifyProductId}:availability`,
      delayMs: 5e3
      // small debounce so rapid multi-variant changes settle first
    });
  } catch (err) {
    console.error(`[webhooks/inventory/update] ${shop}:`, err.message);
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5
}, Symbol.toStringTag, { value: "Module" }));
const action$4 = async ({
  request
}) => {
  const {
    shop,
    topic
  } = await authenticate.webhook(request);
  console.log(`[${topic}] shop=${shop} — cleaning up active data`);
  try {
    await cancelJobsForShop(shop);
    await prisma.$transaction([prisma.session.deleteMany({
      where: {
        shop
      }
    }), prisma.managedCollection.deleteMany({
      where: {
        shop
      }
    }), prisma.productAvailability.deleteMany({
      where: {
        shop
      }
    }), prisma.productPosition.deleteMany({
      where: {
        shop
      }
    }), prisma.activityLog.deleteMany({
      where: {
        shop
      }
    }), prisma.shop.updateMany({
      where: {
        shop
      },
      data: {
        isActive: false
      }
    })]);
  } catch (err) {
    console.error(`[${topic}] cleanup error for ${shop}:`, err.message);
  }
  return new Response();
};
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4
}, Symbol.toStringTag, { value: "Module" }));
const action$3 = async ({
  request
}) => {
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const {
    shop,
    topic,
    payload
  } = await authenticate.webhook(request);
  if (webhookId) {
    try {
      await prisma.webhookReceipt.create({
        data: {
          shop,
          webhookId,
          topic
        }
      });
    } catch (err) {
      if (err.code === "P2002") return new Response();
      throw err;
    }
  }
  try {
    const shopifyProductId = `gid://shopify/Product/${payload.id}`;
    await prisma.$transaction([prisma.productAvailability.deleteMany({
      where: {
        shop,
        shopifyProductId
      }
    }), prisma.productPosition.deleteMany({
      where: {
        shop,
        shopifyProductId
      }
    })]);
  } catch (err) {
    console.error(`[webhooks/products/delete] ${shop}:`, err.message);
  }
  return new Response();
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: "Module" }));
const action$2 = async ({
  request
}) => {
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const {
    shop,
    topic,
    payload
  } = await authenticate.webhook(request);
  if (webhookId) {
    try {
      await prisma.webhookReceipt.create({
        data: {
          shop,
          webhookId,
          topic
        }
      });
    } catch (err) {
      if (err.code === "P2002") return new Response();
      throw err;
    }
  }
  try {
    const shopifyProductId = `gid://shopify/Product/${payload.id}`;
    await enqueueJob({
      shop,
      type: "PRODUCT_AVAILABILITY_CHANGED",
      payload: {
        shopifyProductId
      },
      dedupeKey: `${shop}:${shopifyProductId}:availability`,
      delayMs: 5e3
    });
  } catch (err) {
    console.error(`[webhooks/products/update] ${shop}:`, err.message);
  }
  return new Response();
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2
}, Symbol.toStringTag, { value: "Module" }));
const action$1 = async ({
  request
}) => {
  var _a2;
  const {
    topic,
    shop,
    payload
  } = await authenticate.webhook(request);
  try {
    switch (topic) {
      // We hold no customer data at all — nothing to return.
      case "CUSTOMERS_DATA_REQUEST": {
        console.log(`[compliance] CUSTOMERS_DATA_REQUEST shop=${shop} customer=${(_a2 = payload == null ? void 0 : payload.customer) == null ? void 0 : _a2.id} — no customer data stored`);
        break;
      }
      // We hold no customer data at all — nothing to redact.
      case "CUSTOMERS_REDACT": {
        console.log(`[compliance] CUSTOMERS_REDACT shop=${shop} — no customer data stored`);
        break;
      }
      // Merchant uninstalled 48h+ ago; permanently delete ALL their shop data.
      case "SHOP_REDACT": {
        console.log(`[compliance] SHOP_REDACT shop=${shop}`);
        await prisma.$transaction([prisma.session.deleteMany({
          where: {
            shop
          }
        }), prisma.shop.deleteMany({
          where: {
            shop
          }
        }), prisma.managedCollection.deleteMany({
          where: {
            shop
          }
        }), prisma.productAvailability.deleteMany({
          where: {
            shop
          }
        }), prisma.productPosition.deleteMany({
          where: {
            shop
          }
        }), prisma.job.deleteMany({
          where: {
            shop
          }
        }), prisma.webhookReceipt.deleteMany({
          where: {
            shop
          }
        }), prisma.activityLog.deleteMany({
          where: {
            shop
          }
        })]);
        break;
      }
      default:
        console.log(`[compliance] unknown topic=${topic}`);
    }
  } catch (err) {
    console.error(`[compliance] ${topic} error:`, err.message);
  }
  return new Response(null, {
    status: 200
  });
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1
}, Symbol.toStringTag, { value: "Module" }));
const loader$5 = async ({
  request
}) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const chargeId = url.searchParams.get("charge_id");
  console.log(`[billing/callback] shop=${shop} charge_id=${chargeId}`);
  if (shop) {
    try {
      await prisma.shop.upsert({
        where: {
          shop
        },
        create: {
          shop,
          isActive: true,
          subscriptionId: chargeId || null
        },
        update: {
          isActive: true,
          subscriptionId: chargeId || null
        }
      });
      console.log(`[billing/callback] ${PLAN.key} activated for ${shop}`);
    } catch (e) {
      console.error("[billing/callback] DB error:", e.message);
    }
  }
  const shopName = (shop || "").replace(".myshopify.com", "");
  const appHandle = process.env.SHOPIFY_APP_HANDLE || "downstock";
  if (!shopName) return new Response("Missing shop", {
    status: 400
  });
  return redirect(`https://admin.shopify.com/store/${shopName}/apps/${appHandle}/app`);
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const loader$4 = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const headers$3 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$3,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({
  request
}) => {
  const url = new URL(request.url);
  throw redirect(`/app?${url.searchParams.toString()}`);
};
const _index = UNSAFE_withComponentProps(function Index() {
  return null;
});
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: _index,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const loader$2 = async ({
  request
}) => {
  await authenticate.admin(request);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || ""
  };
};
const app = UNSAFE_withComponentProps(function App2() {
  const {
    apiKey
  } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider, {
    embedded: true,
    apiKey,
    children: [/* @__PURE__ */ jsxs("s-app-nav", {
      children: [/* @__PURE__ */ jsx("s-link", {
        href: "/app",
        children: "Dashboard"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/activity",
        children: "Activity"
      })]
    }), /* @__PURE__ */ jsx(Outlet, {})]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2() {
  return boundary.error(useRouteError());
});
const headers$2 = (headersArgs) => boundary.headers(headersArgs);
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: app,
  headers: headers$2,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const loader$1 = async ({
  request
}) => {
  const {
    session
  } = await authenticate.admin(request);
  const activity = await prisma.activityLog.findMany({
    where: {
      shop: session.shop
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 200
  });
  return {
    activity
  };
};
const app_activity = UNSAFE_withComponentProps(function Activity() {
  const {
    activity
  } = useLoaderData();
  return /* @__PURE__ */ jsx("s-page", {
    heading: "Activity",
    children: /* @__PURE__ */ jsx("s-section", {
      heading: `Last ${activity.length} events`,
      children: activity.length === 0 ? /* @__PURE__ */ jsx("p", {
        style: {
          color: C.textSecondary
        },
        children: "No activity yet."
      }) : /* @__PURE__ */ jsx("div", {
        style: {
          overflowX: "auto"
        },
        children: /* @__PURE__ */ jsxs("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13
          },
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsx("tr", {
              style: {
                borderBottom: `2px solid ${C.border}`
              },
              children: ["Event", "Product", "When"].map((h) => /* @__PURE__ */ jsx("th", {
                style: {
                  padding: "8px 12px",
                  textAlign: "left",
                  color: C.text
                },
                children: h
              }, h))
            })
          }), /* @__PURE__ */ jsx("tbody", {
            children: activity.map((a) => /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: `1px solid ${C.border}`
              },
              children: [/* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 12px"
                },
                children: /* @__PURE__ */ jsx("span", {
                  style: {
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: a.type === "MOVED_DOWN" ? C.bgCaution : C.bgSuccess,
                    color: a.type === "MOVED_DOWN" ? C.textCaution : C.textSuccess
                  },
                  children: a.type === "MOVED_DOWN" ? "Moved down" : "Restored"
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 12px"
                },
                children: a.productTitle || a.shopifyProductId
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 12px",
                  whiteSpace: "nowrap"
                },
                children: new Date(a.createdAt).toLocaleString()
              })]
            }, a.id))
          })]
        })
      })
    })
  });
});
const headers$1 = (headersArgs) => boundary.headers(headersArgs);
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_activity,
  headers: headers$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
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
const loader = async ({
  request
}) => {
  var _a2;
  const {
    session,
    admin
  } = await authenticate.admin(request);
  const shop = session.shop;
  const shopRow = await prisma.shop.upsert({
    where: {
      shop
    },
    create: {
      shop
    },
    update: {}
  });
  const data = await gqlData(admin, COLLECTION_LIST_QUERY, {
    cursor: null
  });
  const nodes = ((_a2 = data.collections) == null ? void 0 : _a2.edges.map((e) => e.node)) || [];
  const managed = await Promise.all(nodes.map((node) => prisma.managedCollection.upsert({
    where: {
      shop_shopifyCollectionId: {
        shop,
        shopifyCollectionId: node.id
      }
    },
    create: {
      shop,
      shopifyCollectionId: node.id,
      title: node.title,
      sortOrder: node.sortOrder
    },
    update: {
      title: node.title,
      sortOrder: node.sortOrder,
      // A collection that just left MANUAL sort can't stay enabled.
      enabled: void 0
      // set below only when it needs to flip off
    }
  })));
  for (const row of managed) {
    if (row.sortOrder !== "MANUAL" && row.enabled) {
      await prisma.managedCollection.update({
        where: {
          id: row.id
        },
        data: {
          enabled: false
        }
      });
      row.enabled = false;
    }
  }
  const productsCountByCollection = Object.fromEntries(nodes.map((n) => {
    var _a3;
    return [n.id, ((_a3 = n.productsCount) == null ? void 0 : _a3.count) ?? 0];
  }));
  const collections = managed.map((row) => ({
    id: row.shopifyCollectionId,
    title: row.title,
    sortOrder: row.sortOrder,
    compatible: row.sortOrder === "MANUAL",
    enabled: row.enabled,
    productCount: productsCountByCollection[row.shopifyCollectionId] ?? 0
  })).sort((a, b) => a.title.localeCompare(b.title));
  const recentActivity = await prisma.activityLog.findMany({
    where: {
      shop
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 5
  });
  const now = /* @__PURE__ */ new Date();
  const inTrial = shopRow.trialEndsAt && shopRow.trialEndsAt > now;
  return {
    isActive: shopRow.isActive,
    inTrial,
    collections,
    recentActivity,
    over50: collections.reduce((sum, c) => sum + c.productCount, 0) > 50
  };
};
const action = async ({
  request
}) => {
  var _a2, _b;
  let session, admin;
  try {
    ({
      session,
      admin
    } = await authenticate.admin(request));
  } catch (e) {
    if (e instanceof Response) throw e;
    return {
      error: "Auth failed: " + e.message
    };
  }
  const shop = session.shop;
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "subscribe") {
    try {
      const resp = await admin.graphql(`mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!, $test: Boolean, $trialDays: Int) {
          appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: $test, trialDays: $trialDays) {
            appSubscription { id }
            confirmationUrl
            userErrors { field message }
          }
        }`, {
        variables: {
          name: PLAN.label,
          returnUrl: `${process.env.SHOPIFY_APP_URL}/billing/callback?shop=${shop}`,
          test: process.env.BILLING_TEST !== "false",
          trialDays: PLAN.trialDays,
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: PLAN.amount,
                  currencyCode: PLAN.currencyCode
                },
                interval: PLAN.interval
              }
            }
          }]
        }
      });
      const data = await resp.json();
      const sub = (_a2 = data.data) == null ? void 0 : _a2.appSubscriptionCreate;
      if ((_b = sub == null ? void 0 : sub.userErrors) == null ? void 0 : _b.length) return {
        error: sub.userErrors[0].message
      };
      if (!(sub == null ? void 0 : sub.confirmationUrl)) return {
        error: "Failed to start subscription"
      };
      throw redirect(sub.confirmationUrl);
    } catch (e) {
      if (e instanceof Response) throw e;
      return {
        error: "Billing error: " + e.message
      };
    }
  }
  if (intent === "toggle_collection") {
    const shopifyCollectionId = form.get("collectionId");
    const enable = form.get("enable") === "true";
    const row = await prisma.managedCollection.findUnique({
      where: {
        shop_shopifyCollectionId: {
          shop,
          shopifyCollectionId
        }
      }
    });
    if (!row) return {
      error: "Unknown collection"
    };
    if (enable && row.sortOrder !== "MANUAL") {
      return {
        error: "This collection isn't set to Manual sorting, so DownStock can't manage it."
      };
    }
    if (!enable) {
      await prisma.managedCollection.update({
        where: {
          id: row.id
        },
        data: {
          enabled: false
        }
      });
      return {
        success: true
      };
    }
    try {
      const {
        ids,
        soldOut,
        sortOrder
      } = await fetchCollectionAvailability(admin, shopifyCollectionId);
      if (sortOrder !== "MANUAL") {
        await prisma.managedCollection.update({
          where: {
            id: row.id
          },
          data: {
            sortOrder,
            enabled: false
          }
        });
        return {
          error: "Collection sort mode changed — no longer Manual sort."
        };
      }
      const desired = buildStableGroups(ids, soldOut);
      const moves = computeReorderMoves(ids, desired);
      if (moves.length > 0) await reorderCollection(admin, shopifyCollectionId, moves);
      const now = /* @__PURE__ */ new Date();
      await prisma.$transaction([prisma.managedCollection.update({
        where: {
          id: row.id
        },
        data: {
          enabled: true,
          lastSyncedAt: now
        }
      }), ...ids.map((id) => prisma.productAvailability.upsert({
        where: {
          shop_shopifyProductId: {
            shop,
            shopifyProductId: id
          }
        },
        create: {
          shop,
          shopifyProductId: id,
          isSoldOut: soldOut.has(id),
          lastCheckedAt: now
        },
        update: {
          isSoldOut: soldOut.has(id),
          lastCheckedAt: now
        }
      }))]);
      for (const id of ids) {
        if (!soldOut.has(id)) continue;
        const idx = ids.indexOf(id);
        await prisma.productPosition.upsert({
          where: {
            shop_shopifyCollectionId_shopifyProductId: {
              shop,
              shopifyCollectionId,
              shopifyProductId: id
            }
          },
          create: {
            shop,
            shopifyCollectionId,
            shopifyProductId: id,
            originalPosition: idx,
            previousAnchorProductId: ids[idx - 1] || null,
            nextAnchorProductId: ids[idx + 1] || null,
            isMovedDown: true
          },
          update: {}
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
            type: "MOVED_DOWN"
          }
        });
      }
      return {
        success: true,
        movedCount
      };
    } catch (e) {
      return {
        error: "Scan failed: " + e.message
      };
    }
  }
  return null;
};
const app__index = UNSAFE_withComponentProps(function Dashboard() {
  var _a2;
  const {
    isActive,
    inTrial,
    collections,
    recentActivity,
    over50
  } = useLoaderData();
  const fetcher = useFetcher();
  const errorMessage = (_a2 = fetcher.data) == null ? void 0 : _a2.error;
  const subscribed = isActive || inTrial;
  const compatible = collections.filter((c) => c.compatible);
  const incompatible = collections.filter((c) => !c.compatible);
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "DownStock",
    children: [!subscribed && /* @__PURE__ */ jsxs("s-banner", {
      tone: "info",
      title: "Start your 14-day free trial",
      children: [/* @__PURE__ */ jsx("s-paragraph", {
        children: "$1.99/month after the trial — one plan, everything included. No charge until day 15."
      }), /* @__PURE__ */ jsxs("form", {
        method: "post",
        target: "_top",
        children: [/* @__PURE__ */ jsx("input", {
          type: "hidden",
          name: "intent",
          value: "subscribe"
        }), /* @__PURE__ */ jsx("button", {
          type: "submit",
          style: {
            marginTop: 8,
            padding: "8px 20px",
            background: C.btnBg,
            color: C.btnText,
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer"
          },
          children: "Start free trial"
        })]
      })]
    }), errorMessage && /* @__PURE__ */ jsx("s-banner", {
      tone: "critical",
      title: "Something went wrong",
      children: /* @__PURE__ */ jsx("s-paragraph", {
        children: errorMessage
      })
    }), over50 && /* @__PURE__ */ jsx("s-section", {
      heading: "Built for growing catalogs",
      children: /* @__PURE__ */ jsx("s-paragraph", {
        style: {
          color: C.textSecondary
        },
        children: "DownStock has no product limit — it's a flat $1.99/mo whether you have 51 products or 5,000."
      })
    }), /* @__PURE__ */ jsx("s-section", {
      heading: `Manual-sort collections (${compatible.length})`,
      children: compatible.length === 0 ? /* @__PURE__ */ jsx("p", {
        style: {
          color: C.textSecondary
        },
        children: `No collections are set to Manual sorting yet. Switch a collection's sort order to "Manual" in Shopify admin to manage it here.`
      }) : /* @__PURE__ */ jsx("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10
        },
        children: compatible.map((c) => /* @__PURE__ */ jsx(CollectionRow, {
          collection: c,
          subscribed,
          fetcher
        }, c.id))
      })
    }), incompatible.length > 0 && /* @__PURE__ */ jsxs("s-section", {
      heading: `Unsupported collections (${incompatible.length})`,
      children: [/* @__PURE__ */ jsx("p", {
        style: {
          color: C.textSecondary,
          marginBottom: 10
        },
        children: "These collections use a sort order other than Manual, so DownStock can't safely reorder them — we never change a collection's sort mode for you."
      }), /* @__PURE__ */ jsx("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8
        },
        children: incompatible.map((c) => /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            border: `1px solid ${C.border}`,
            borderRadius: 8
          },
          children: [/* @__PURE__ */ jsx("span", {
            children: c.title
          }), /* @__PURE__ */ jsxs("span", {
            style: {
              fontSize: 12,
              color: C.textCaution,
              fontWeight: 600
            },
            children: ["Sort: ", c.sortOrder.replace(/_/g, " ").toLowerCase(), " — needs Manual"]
          })]
        }, c.id))
      })]
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "Recent activity",
      children: [recentActivity.length === 0 ? /* @__PURE__ */ jsx("p", {
        style: {
          color: C.textSecondary
        },
        children: "Nothing moved yet — enable a collection above to run its first scan."
      }) : /* @__PURE__ */ jsx("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6
        },
        children: recentActivity.map((a) => /* @__PURE__ */ jsxs("div", {
          style: {
            fontSize: 13,
            color: C.text
          },
          children: [/* @__PURE__ */ jsxs("strong", {
            children: [a.type === "MOVED_DOWN" ? "Moved down" : "Restored", ":"]
          }), " ", a.productTitle || a.shopifyProductId, " —", " ", /* @__PURE__ */ jsx("span", {
            style: {
              color: C.textSecondary
            },
            children: new Date(a.createdAt).toLocaleString()
          })]
        }, a.id))
      }), /* @__PURE__ */ jsx("div", {
        style: {
          marginTop: 10
        },
        children: /* @__PURE__ */ jsx("a", {
          href: "/app/activity",
          style: {
            color: C.textInteractive,
            fontSize: 14,
            textDecoration: "none"
          },
          children: "View full activity log →"
        })
      })]
    })]
  });
});
function CollectionRow({
  collection,
  subscribed,
  fetcher
}) {
  var _a2;
  const busy = fetcher.state !== "idle" && ((_a2 = fetcher.formData) == null ? void 0 : _a2.get("collectionId")) === collection.id;
  return /* @__PURE__ */ jsxs("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 14px",
      border: `1px solid ${C.border}`,
      borderRadius: 8
    },
    children: [/* @__PURE__ */ jsxs("div", {
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          fontWeight: 600,
          fontSize: 14
        },
        children: collection.title
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          fontSize: 12,
          color: C.textSecondary
        },
        children: [collection.productCount, " products"]
      })]
    }), /* @__PURE__ */ jsxs(fetcher.Form, {
      method: "post",
      children: [/* @__PURE__ */ jsx("input", {
        type: "hidden",
        name: "intent",
        value: "toggle_collection"
      }), /* @__PURE__ */ jsx("input", {
        type: "hidden",
        name: "collectionId",
        value: collection.id
      }), /* @__PURE__ */ jsx("input", {
        type: "hidden",
        name: "enable",
        value: (!collection.enabled).toString()
      }), /* @__PURE__ */ jsx("button", {
        type: "submit",
        disabled: !subscribed || busy,
        style: {
          padding: "6px 16px",
          background: collection.enabled ? "transparent" : C.btnBg,
          color: collection.enabled ? C.textCritical : C.btnText,
          border: collection.enabled ? `1.5px solid ${C.borderCritical}` : "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: subscribed ? "pointer" : "not-allowed",
          opacity: subscribed ? 1 : 0.5
        },
        children: busy ? "Working…" : collection.enabled ? "Disable" : "Enable"
      })]
    })]
  });
}
const headers = (headersArgs) => boundary.headers(headersArgs);
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: app__index,
  headers,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-Cl-K7Lud.js", "imports": ["/assets/jsx-runtime-B_5HfUek.js", "/assets/chunk-OB3PAWPO-CrB3QR8G.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-tvJOaV3X.js", "imports": ["/assets/jsx-runtime-B_5HfUek.js", "/assets/chunk-OB3PAWPO-CrB3QR8G.js", "/assets/colors-BBDuMQrQ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.collections.update": { "id": "routes/webhooks.collections.update", "parentId": "root", "path": "webhooks/collections/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.collections.update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.inventory.update": { "id": "routes/webhooks.inventory.update", "parentId": "root", "path": "webhooks/inventory/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.inventory.update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.products.delete": { "id": "routes/webhooks.products.delete", "parentId": "root", "path": "webhooks/products/delete", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.products.delete-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.products.update": { "id": "routes/webhooks.products.update", "parentId": "root", "path": "webhooks/products/update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.products.update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.compliance": { "id": "routes/webhooks.compliance", "parentId": "root", "path": "webhooks/compliance", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.compliance-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/billing.callback": { "id": "routes/billing.callback", "parentId": "root", "path": "billing/callback", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/billing.callback-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/_index-Brb-9Dg5.js", "imports": ["/assets/chunk-OB3PAWPO-CrB3QR8G.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app-BpmLSLQT.js", "imports": ["/assets/chunk-OB3PAWPO-CrB3QR8G.js", "/assets/jsx-runtime-B_5HfUek.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.activity": { "id": "routes/app.activity", "parentId": "routes/app", "path": "activity", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.activity-CCNFokjQ.js", "imports": ["/assets/chunk-OB3PAWPO-CrB3QR8G.js", "/assets/jsx-runtime-B_5HfUek.js", "/assets/colors-BBDuMQrQ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app._index-DoNdRxXb.js", "imports": ["/assets/chunk-OB3PAWPO-CrB3QR8G.js", "/assets/jsx-runtime-B_5HfUek.js", "/assets/colors-BBDuMQrQ.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-8b1a1158.js", "version": "8b1a1158", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "v8_passThroughRequests": false, "v8_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.collections.update": {
    id: "routes/webhooks.collections.update",
    parentId: "root",
    path: "webhooks/collections/update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.inventory.update": {
    id: "routes/webhooks.inventory.update",
    parentId: "root",
    path: "webhooks/inventory/update",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/webhooks.products.delete": {
    id: "routes/webhooks.products.delete",
    parentId: "root",
    path: "webhooks/products/delete",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/webhooks.products.update": {
    id: "routes/webhooks.products.update",
    parentId: "root",
    path: "webhooks/products/update",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/webhooks.compliance": {
    id: "routes/webhooks.compliance",
    parentId: "root",
    path: "webhooks/compliance",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/billing.callback": {
    id: "routes/billing.callback",
    parentId: "root",
    path: "billing/callback",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route9
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app.activity": {
    id: "routes/app.activity",
    parentId: "routes/app",
    path: "activity",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route12
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
