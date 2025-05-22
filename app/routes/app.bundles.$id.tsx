import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { BundleService } from "../services/bundle.server";
import type { Bundle } from "../types/bundle";

export async function loader({ params, request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const { id } = params;
  if (!id) throw new Response("Not found", { status: 404 });
  const bundleService = new BundleService();
  const bundle = await bundleService.getBundle(id as string);
  if (!bundle) throw new Response("Not found", { status: 404 });
  return json({
    bundle: {
      ...bundle,
      createdAt: bundle.createdAt.toISOString(),
      updatedAt: bundle.updatedAt.toISOString(),
    },
  });
}

export default function BundleDetail() {
  const { bundle } = useLoaderData<typeof loader>();
  return (
    <Page
      title={bundle.title}
      backAction={{
        content: "Bundles",
        url: "/app/bundles",
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h1">
                {bundle.title}
              </Text>
              <Text as="p">
                <span
                  dangerouslySetInnerHTML={{
                    __html: (
                      bundle.description?.split(/<br\s*\/?>/i)[1] || ""
                    ).trim(),
                  }}
                />
              </Text>
              <InlineStack gap="400">
                <Text as="span">
                  Product: <b>{bundle.title || bundle.productId}</b>
                </Text>
                <Badge tone={bundle.isActive ? "success" : "critical"}>
                  {bundle.isActive ? "Active" : "Inactive"}
                </Badge>
              </InlineStack>
              <Text as="span">
                Created: {new Date(bundle.createdAt).toLocaleString()}
              </Text>
              <Text as="span">
                Updated: {new Date(bundle.updatedAt).toLocaleString()}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Blocks
              </Text>
              {bundle.blocks.length === 0 && <Text as="span">No blocks</Text>}
              {bundle.blocks.map((block, i) => (
                <Card key={block.id || i}>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      {block.title}
                    </Text>
                    <Text as="p">{block.description}</Text>
                    <Text as="span">Inputs: {block.inputs.length}</Text>
                    {block.inputs.map((input, j) => (
                      <Card key={input.id || j}>
                        <BlockStack gap="100">
                          <Text as="h4" variant="headingSm">
                            {input.title}
                          </Text>
                          <Text as="span">Type: {input.type}</Text>
                          <Text as="span">
                            Required: {input.required ? "Yes" : "No"}
                          </Text>
                          <Text as="span">
                            Description: {input.description}
                          </Text>
                          {Array.isArray(input.options) &&
                            input.options.length > 0 && (
                              <>
                                <Text as="span">Options:</Text>
                                <ul>
                                  {input.options.map((opt, k) => {
                                    if (
                                      typeof opt === "object" &&
                                      opt !== null &&
                                      "label" in opt &&
                                      typeof opt.label === "string"
                                    ) {
                                      const price =
                                        "price" in opt &&
                                        opt.price &&
                                        typeof opt.price === "object" &&
                                        "value" in opt.price &&
                                        "type" in opt.price
                                          ? `(${opt.price.value} ${opt.price.type})`
                                          : null;
                                      return (
                                        <li key={k}>
                                          <b>{opt.label}</b>
                                          {typeof opt.variant === "object" &&
                                            opt.variant !== null &&
                                            "title" in opt.variant &&
                                            typeof opt.variant.title ===
                                              "string" &&
                                            opt.variant.title && (
                                              <>
                                                {" "}
                                                — <i>{opt.variant.title}</i>
                                              </>
                                            )}
                                          {price && (
                                            <>
                                              {" "}
                                              — <span>{price}</span>
                                            </>
                                          )}
                                          {opt.maxQuantity && (
                                            <> — Max: {opt.maxQuantity}</>
                                          )}
                                        </li>
                                      );
                                    }
                                    return null;
                                  })}
                                </ul>
                              </>
                            )}
                        </BlockStack>
                      </Card>
                    ))}
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
