import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
};

type BundleResponse = {
  product: {
    id: string;
    title: string;
    metafield: {
      value: string;
    } | null;
  } | null;
};

const GET_BUNDLE_QUERY = `
  query GetBundle($id: ID!) {
    product(id: $id) {
      id
      title
      metafield(namespace: "custom", key: "bundle_configuration") {
        value
      }
    }
  }
`;

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  try {
    const { productId } = params;
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const response = await admin.graphql(GET_BUNDLE_QUERY, {
      variables: {
        id: `gid://shopify/Product/${productId}`,
      },
    });

    const responseJson =
      (await response.json()) as GraphQLResponse<BundleResponse>;
    const { data, errors } = responseJson;

    if (errors) {
      console.error("GraphQL errors:", errors);
      throw new Error("Failed to fetch bundle data");
    }

    if (!data?.product?.metafield?.value) {
      throw new Response("Bundle not found", { status: 404 });
    }

    return json(
      {
        ...data.product,
        bundle: JSON.parse(data.product.metafield.value),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching bundle:", error);
    return json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    );
  }
};
