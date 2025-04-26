import shopify from "../../shopify.js";

export default async function handler(req, res) {
  const session = await shopify.Utils.loadCurrentSession(req, res);

  if (!session) {
    return res.status(401).send("Unauthorized");
  }

  const client = new shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    // Get all products with bundle configuration metafield
    const response = await client.query({
      data: {
        query: `{
          products(first: 50, query: "metafield:custom.bundle_configuration") {
            edges {
              node {
                id
                title
                handle
                metafield(namespace: "custom", key: "bundle_configuration") {
                  value
                }
              }
            }
          }
        }`
      }
    });

    const bundles = response.body.data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      configuration: node.metafield ? JSON.parse(node.metafield.value) : null
    }));

    return res.status(200).json({ bundles });
  } catch (error) {
    console.error("Error fetching bundles:", error);
    return res.status(500).json({ error: error.message });
  }
} 