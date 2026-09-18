import { redirect } from "react-router";

// Shopify loads the bare application_url first (with shop/host/embedded
// query params) before anything else — this route's only job is to forward
// that straight into the embedded app at /app, preserving those params.
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  throw redirect(`/app?${url.searchParams.toString()}`);
};

export default function Index() {
  return null;
}
