import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import { enqueueJob } from "../jobs.server.js";
import { gqlData } from "../cron.server.js";

// inventory_levels/update payload carries inventory_item_id, NOT a product
// id — resolve item -> variant -> product first. This route only verifies +
// dedupes + resolves the product id + enqueues; the actual re-sort happens
// in the job poller (app/cron.server.js), never inline here.
export const action = async ({ request }) => {
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const { shop, topic, payload, admin } = await authenticate.webhook(request);

  if (webhookId) {
    try {
      await prisma.webhookReceipt.create({ data: { shop, webhookId, topic } });
    } catch (err) {
      if (err.code === "P2002") return new Response(); // already processed this delivery
      throw err;
    }
  }

  try {
    const inventoryItemGid = `gid://shopify/InventoryItem/${payload.inventory_item_id}`;
    const data = await gqlData(
      admin,
      `query ItemProduct($id: ID!) {
        inventoryItem(id: $id) { variant { product { id } } }
      }`,
      { id: inventoryItemGid },
    );
    const shopifyProductId = data.inventoryItem?.variant?.product?.id;
    if (!shopifyProductId) return new Response();

    // dedupeKey coalesces a burst of inventory webhooks for the same product
    // (multiple variants changing near-simultaneously) into one job that
    // reads the LATEST availability when it actually runs.
    await enqueueJob({
      shop,
      type: "PRODUCT_AVAILABILITY_CHANGED",
      payload: { shopifyProductId },
      dedupeKey: `${shop}:${shopifyProductId}:availability`,
      delayMs: 5000, // small debounce so rapid multi-variant changes settle first
    });
  } catch (err) {
    console.error(`[webhooks/inventory/update] ${shop}:`, err.message);
  }

  return new Response();
};
