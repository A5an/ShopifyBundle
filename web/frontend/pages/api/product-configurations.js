import { DataType } from "@shopify/shopify-api";
import shopify from "../../shopify.js";

export default async function handler(req, res) {
  const session = await shopify.Utils.loadCurrentSession(req, res);

  if (!session) {
    return res.status(401).send("Unauthorized");
  }

  const client = new shopify.Clients.Graphql(session.shop, session.accessToken);

  switch (req.method) {
    case "POST":
      try {
        // Save configuration to metafield
        const { productId, configuration } = req.body;
        
        const response = await client.query({
          data: {
            query: `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields {
                  key
                  namespace
                  value
                  type
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
            variables: {
              metafields: [
                {
                  key: "bundle_configuration",
                  namespace: "custom",
                  ownerId: productId,
                  type: "json",
                  value: JSON.stringify(configuration)
                }
              ]
            }
          }
        });

        return res.status(200).json(response.body);
      } catch (error) {
        console.error("Error saving configuration:", error);
        return res.status(500).json({ error: error.message });
      }

    case "GET":
      try {
        const { productId } = req.query;
        
        const response = await client.query({
          data: {
            query: `query getProductConfiguration($productId: ID!) {
              product(id: $productId) {
                metafield(namespace: "custom", key: "bundle_configuration") {
                  value
                }
              }
            }`,
            variables: {
              productId
            }
          }
        });

        return res.status(200).json(response.body);
      } catch (error) {
        console.error("Error fetching configuration:", error);
        return res.status(500).json({ error: error.message });
      }

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 