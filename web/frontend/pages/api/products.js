import shopify from "../../shopify.js";

export default async function handler(req, res) {
  const session = await shopify.Utils.loadCurrentSession(req, res);

  if (!session) {
    return res.status(401).send("Unauthorized");
  }

  const client = new shopify.Clients.Graphql(session.shop, session.accessToken);

  try {
    const response = await client.query({
      data: {
        query: `{
          products(first: 50) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
        }`
      }
    });

    const products = response.body.data.products.edges.map(({ node }) => node);
    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: error.message });
  }
} 