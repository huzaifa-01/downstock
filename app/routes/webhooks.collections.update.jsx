import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import { gqlData } from "../cron.server.js";

// A collection's sort order (or title) may have changed. If a merchant
// switches an enabled collection away from MANUAL, we must stop managing it
// immediately and surface that in the dashboard — never silently convert
// their sort mode back, per the spec.
export const action = async ({ request }) => {
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");
  const { shop, topic, payload, admin } = await authenticate.webhook(request);

  if (webhookId) {
    try {
      await prisma.webhookReceipt.create({ data: { shop, webhookId, topic } });
    } catch (err) {
      if (err.code === "P2002") return new Response();
      throw err;
    }
  }

  try {
    const shopifyCollectionId = `gid://shopify/Collection/${payload.id}`;
    const existing = await prisma.managedCollection.findUnique({
      where: { shop_shopifyCollectionId: { shop, shopifyCollectionId } },
    });
    if (!existing) return new Response(); // never seen this collection — nothing to refresh

    const data = await gqlData(
      admin,
      `query CollectionMeta($id: ID!) {
        collection(id: $id) { title sortOrder }
      }`,
      { id: shopifyCollectionId },
    );
    const meta = data.collection;
    if (!meta) return new Response();

    await prisma.managedCollection.update({
      where: { id: existing.id },
      data: {
        title: meta.title,
        sortOrder: meta.sortOrder,
        // Sort mode changed away from MANUAL: disable, don't fight the merchant.
        enabled: existing.enabled && meta.sortOrder === "MANUAL",
      },
    });
  } catch (err) {
    console.error(`[webhooks/collections/update] ${shop}:`, err.message);
  }

  return new Response();
};
