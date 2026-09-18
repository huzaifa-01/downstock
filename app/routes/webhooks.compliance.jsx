import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";

// DownStock never stores customer PII (name/email/phone/address) — its data
// model is entirely shop/product/collection scoped. That makes two of the
// three mandatory topics trivial by design, not by omission.
export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  try {
    switch (topic) {
      // We hold no customer data at all — nothing to return.
      case "CUSTOMERS_DATA_REQUEST": {
        console.log(`[compliance] CUSTOMERS_DATA_REQUEST shop=${shop} customer=${payload?.customer?.id} — no customer data stored`);
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
        await prisma.$transaction([
          prisma.session.deleteMany({ where: { shop } }),
          prisma.shop.deleteMany({ where: { shop } }),
          prisma.managedCollection.deleteMany({ where: { shop } }),
          prisma.productAvailability.deleteMany({ where: { shop } }),
          prisma.productPosition.deleteMany({ where: { shop } }),
          prisma.job.deleteMany({ where: { shop } }),
          prisma.webhookReceipt.deleteMany({ where: { shop } }),
          prisma.activityLog.deleteMany({ where: { shop } }),
        ]);
        break;
      }

      default:
        console.log(`[compliance] unknown topic=${topic}`);
    }
  } catch (err) {
    console.error(`[compliance] ${topic} error:`, err.message);
  }

  return new Response(null, { status: 200 });
};
