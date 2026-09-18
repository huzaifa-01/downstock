import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { C } from "../colors.js";
import prisma from "../db.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const activity = await prisma.activityLog.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return { activity };
};

export default function Activity() {
  const { activity } = useLoaderData();
  return (
    <s-page heading="Activity">
      <s-section heading={`Last ${activity.length} events`}>
        {activity.length === 0 ? (
          <p style={{ color: C.textSecondary }}>No activity yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {["Event", "Product", "When"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.text }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: a.type === "MOVED_DOWN" ? C.bgCaution : C.bgSuccess,
                        color: a.type === "MOVED_DOWN" ? C.textCaution : C.textSuccess,
                      }}>
                        {a.type === "MOVED_DOWN" ? "Moved down" : "Restored"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{a.productTitle || a.shopifyProductId}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
