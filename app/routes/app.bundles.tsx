import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Outlet, useLocation, Link } from "@remix-run/react";
import { Page, Layout, IndexTable, Text, Badge } from "@shopify/polaris";
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
            ]}
            selectable={false}
          >
            {bundles.map((bundle: SerializedBundle) => (
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
                <IndexTable.Cell>{bundle.blocks.length} blocks</IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
