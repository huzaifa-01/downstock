import { redirect } from "react-router";
import prisma from "../db.server.js";
import { PLAN } from "../plans.js";

// Handles Shopify billing returnUrl callback — runs in top browser window
// (no iframe/auth needed). Mirrors CODsafe's callback route.
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const chargeId = url.searchParams.get("charge_id");

  console.log(`[billing/callback] shop=${shop} charge_id=${chargeId}`);

  if (shop) {
    try {
      await prisma.shop.upsert({
        where: { shop },
        create: { shop, isActive: true, subscriptionId: chargeId || null },
        update: { isActive: true, subscriptionId: chargeId || null },
      });
      console.log(`[billing/callback] ${PLAN.key} activated for ${shop}`);
    } catch (e) {
      console.error("[billing/callback] DB error:", e.message);
    }
  }

  const shopName = (shop || "").replace(".myshopify.com", "");
  const appHandle = process.env.SHOPIFY_APP_HANDLE || "downstock";

  if (!shopName) return new Response("Missing shop", { status: 400 });

  // Top-level redirect to Shopify admin — works because this is NOT inside an iframe
  return redirect(`https://admin.shopify.com/store/${shopName}/apps/${appHandle}/app`);
};
