import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import { FONTS } from "./colors.js";

// @shopify/shopify-app-react-router 1.x's AppProvider does NOT auto-inject
// the App Bridge / Polaris web-component scripts (that only became
// automatic in 2.1.0+) — without them, <s-page>/<s-section> etc. in the
// dashboard render as undefined custom elements with no layout, i.e. a
// blank embedded app. Load them explicitly, in the order Shopify requires:
// api-key meta tag, then app-bridge.js, then polaris.js immediately after.
export const loader = async () => {
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="shopify-api-key" content={apiKey} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS.googleFontsHref} />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
