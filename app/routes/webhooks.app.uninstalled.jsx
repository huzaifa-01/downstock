import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import { cancelJobsForShop } from "../jobs.server.js";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[${topic}] shop=${shop} — cleaning up active data`);

  try {
    // Stop any queued/in-flight reorder work for this shop immediately so
    // nothing fires against a shop that just revoked our access token.
    await cancelJobsForShop(shop);

    // Delete operational data now (not customer PII — DownStock never stores
    // any). Full SHOP_REDACT compliance delete happens again via the
    // mandatory webhook ~48h later; this is just prompt housekeeping so a
    // reinstall starts clean rather than resurrecting stale state.
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { shop } }),
      prisma.managedCollection.deleteMany({ where: { shop } }),
      prisma.productAvailability.deleteMany({ where: { shop } }),
      prisma.productPosition.deleteMany({ where: { shop } }),
      prisma.activityLog.deleteMany({ where: { shop } }),
      prisma.shop.updateMany({ where: { shop }, data: { isActive: false } }),
    ]);
  } catch (err) {
    console.error(`[${topic}] cleanup error for ${shop}:`, err.message);
  }

  return new Response();
};
