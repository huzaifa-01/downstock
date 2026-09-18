import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import { enqueueJob } from "../jobs.server.js";

// Catches changes that affect sellability without an inventory_levels/update
// firing — e.g. a variant's inventory policy switching to/from "continue
// selling when out of stock", or a variant being deleted.
export const action = async ({ request }) => {
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const { shop, topic, payload } = await authenticate.webhook(request);

  if (webhookId) {
    try {
      await prisma.webhookReceipt.create({ data: { shop, webhookId, topic } });
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
      payload: { shopifyProductId },
      dedupeKey: `${shop}:${shopifyProductId}:availability`,
      delayMs: 5000,
    });
  } catch (err) {
    console.error(`[webhooks/products/update] ${shop}:`, err.message);
  }

  return new Response();
};
