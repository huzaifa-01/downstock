import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";

// Product deleted — clean up every record we hold for it so it doesn't
// linger as a phantom "sold out" entry forever.
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
    await prisma.$transaction([
      prisma.productAvailability.deleteMany({ where: { shop, shopifyProductId } }),
      prisma.productPosition.deleteMany({ where: { shop, shopifyProductId } }),
    ]);
  } catch (err) {
    console.error(`[webhooks/products/delete] ${shop}:`, err.message);
  }

  return new Response();
};
