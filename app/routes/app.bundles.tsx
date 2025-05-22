import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  useLoaderData,
  Outlet,
  useLocation,
  Link,
  useFetcher,
  Form,
} from "@remix-run/react";
import {
  Page,
  Layout,
  IndexTable,
  Text,
  Badge,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { BundleService } from "../services/bundle.server";
import type { Bundle } from "../types/bundle";

type SerializedBundle = {
  id: string;
  title: string;
  description: string | null;
  productId: string;
  blocks: Array<{
    id: string;
    title: string;
    inputs: Array<any>;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const bundleService = new BundleService();
  const bundles = await bundleService.listBundles();

  return json({
    bundles: bundles.map((bundle) => ({
      ...bundle,
      createdAt: bundle.createdAt.toISOString(),
      updatedAt: bundle.updatedAt.toISOString(),
    })),
  });
}

export default function Bundles() {
  const { bundles } = useLoaderData<typeof loader>();
  const location = useLocation();

  // If we're not on the main bundles page, render the child route
  if (location.pathname !== "/app/bundles") {
    return <Outlet />;
  }

  return (
    <Page
      title="Bundle Management"
      primaryAction={
        <Link to="/app/bundles/new">
          <button className="Polaris-Button Polaris-Button--primary">
            <span className="Polaris-Button__Content">Create Bundle</span>
          </button>
        </Link>
      }
    >
      <Layout>
        <Layout.Section>
          <IndexTable
            resourceName={{ singular: "Bundle", plural: "Bundles" }}
            itemCount={bundles.length}
            headings={[
              { title: "Title" },
              { title: "Product ID" },
              { title: "Status" },
              { title: "Blocks" },
              { title: "Actions" },
            ]}
            selectable={false}
          >
            {bundles.map((bundle: SerializedBundle) => {
              const fetcher = useFetcher();
              return (
                <IndexTable.Row key={bundle.id} id={bundle.id} position={0}>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                      <Link
                        to={`/app/bundles/${bundle.id}`}
                        className="Polaris-Link"
                      >
                        {bundle.title}
                      </Link>
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{bundle.productId}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge tone={bundle.isActive ? "success" : "critical"}>
                      {bundle.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {bundle.blocks.length} blocks
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <fetcher.Form method="delete" action=".">
                      <input type="hidden" name="bundleId" value={bundle.id} />
                      <button
                        type="submit"
                        className="Polaris-Button Polaris-Button--destructive Polaris-Button--sizeMicro"
                      >
                        <span className="Polaris-Button__Content">Delete</span>
                      </button>
                    </fetcher.Form>
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  if (!admin) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const bundleId = formData.get("bundleId") as string;
  const requestMethod = request.method;

  if (requestMethod === "DELETE") {
    if (!bundleId) {
      return json({ error: "Missing bundle ID" }, { status: 400 });
    }
    try {
      const bundleService = new BundleService();
      await bundleService.deleteBundle(bundleId);
      return json({ success: true });
    } catch (error: any) {
      console.error("Error deleting bundle:", error);
      return json(
        { error: error.message || "Failed to delete bundle" },
        { status: 500 },
      );
    }
  }

  // Handle other request methods if necessary, or return a method not allowed error
  return new Response("Method Not Allowed", { status: 405 });
}
