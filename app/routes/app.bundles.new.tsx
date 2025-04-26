import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Banner,
  Icon,
  Modal,
  EmptyState,
  Select,
  Checkbox,
} from "@shopify/polaris";
import { MenuVerticalIcon, DeleteIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";
import { BundleService } from "../services/bundle.server";
import type { InputType, OptionValue, PriceModifier } from "../types/bundle";
import { authenticate } from "../shopify.server";

type ActionData = {
  status: "success" | "error";
  message?: string;
};

type ResourceSelection = {
  selection: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
};

type ShopifyProduct = {
  id: string;
  title: string;
  descriptionHtml?: string;
  variants: Array<{
    id: string;
    title: string;
  }>;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const productId = formData.get("productId") as string;
  const blocksData = JSON.parse(formData.get("blocks") as string);

  try {
    const bundleService = new BundleService();
    await bundleService.createBundle({
      title,
      description,
      productId,
      isActive: true,
      blocks: blocksData,
    });

    return json({ status: "success" });
  } catch (error) {
    console.error("Failed to create bundle:", error);
    return json<ActionData>(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 400 },
    );
  }
}

export default function NewBundle() {
  const navigate = useNavigate();
  const actionData = useActionData<ActionData>();

  const app = useAppBridge();
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(
    null,
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [blocks, setBlocks] = useState<
    Array<{
      title: string;
      description: string;
      position: number;
      inputs: Array<{
        title: string;
        description: string;
        type: InputType;
        position: number;
        required: boolean;
        options: OptionValue[];
      }>;
    }>
  >([]);

  const inputTypes = [
    { label: "Multi Select", value: "MULTI_SELECT" },
    { label: "Single Select", value: "ONE_SELECT" },
    { label: "Radio Buttons", value: "RADIO" },
    { label: "File Upload", value: "FILE" },
  ];

  const handleProductSelect = useCallback(async () => {
    const response = await app.resourcePicker({
      type: "product",
      multiple: false,
    });

    if (response?.selection?.[0]) {
      const product = response.selection[0] as ShopifyProduct;
      setSelectedProduct(product);
      setFormData({
        title: product.title,
        description: product.descriptionHtml || "",
      });
    }
  }, [app]);

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        title: "",
        description: "",
        position: blocks.length + 1,
        inputs: [],
      },
    ]);
  };

  const addInput = (blockIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].inputs.push({
      title: "",
      description: "",
      type: "MULTI_SELECT",
      position: newBlocks[blockIndex].inputs.length + 1,
      required: false,
      options: [],
    });
    setBlocks(newBlocks);
  };

  const addOption = (blockIndex: number, inputIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].inputs[inputIndex].options.push({
      id: crypto.randomUUID(),
      label: "",
      price: { value: 0, type: "fixed" },
      maxQuantity: undefined,
      showFileUpload: false,
    });
    setBlocks(newBlocks);
  };

  const updateBlock = (index: number, field: string, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setBlocks(newBlocks);
  };

  const updateInput = (
    blockIndex: number,
    inputIndex: number,
    field: string,
    value: any,
  ) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].inputs[inputIndex] = {
      ...newBlocks[blockIndex].inputs[inputIndex],
      [field]: value,
    };
    setBlocks(newBlocks);
  };

  const updateOption = (
    blockIndex: number,
    inputIndex: number,
    optionIndex: number,
    field: keyof OptionValue | "price.type" | "price.value",
    value: any,
  ) => {
    const newBlocks = [...blocks];
    const option =
      newBlocks[blockIndex].inputs[inputIndex].options[optionIndex];

    if (field.startsWith("price.")) {
      const priceField = field.split(".")[1] as keyof PriceModifier;
      option.price = {
        value: priceField === "value" ? value || 0 : option.price?.value || 0,
        type:
          priceField === "type"
            ? value || "fixed"
            : option.price?.type || "fixed",
      };
    } else {
      (option as any)[field] = value;
    }

    setBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const removeInput = (blockIndex: number, inputIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].inputs = newBlocks[blockIndex].inputs.filter(
      (_, i) => i !== inputIndex,
    );
    setBlocks(newBlocks);
  };

  const removeOption = (
    blockIndex: number,
    inputIndex: number,
    optionIndex: number,
  ) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].inputs[inputIndex].options.splice(optionIndex, 1);
    setBlocks(newBlocks);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[index],
    ];

    // Update positions
    newBlocks.forEach((block, i) => {
      block.position = i + 1;
    });

    setBlocks(newBlocks);
  };

  const moveInput = (
    blockIndex: number,
    inputIndex: number,
    direction: "up" | "down",
  ) => {
    const inputs = blocks[blockIndex].inputs;
    if (
      (direction === "up" && inputIndex === 0) ||
      (direction === "down" && inputIndex === inputs.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? inputIndex - 1 : inputIndex + 1;
    [
      newBlocks[blockIndex].inputs[inputIndex],
      newBlocks[blockIndex].inputs[targetIndex],
    ] = [
      newBlocks[blockIndex].inputs[targetIndex],
      newBlocks[blockIndex].inputs[inputIndex],
    ];

    // Update positions
    newBlocks[blockIndex].inputs.forEach((input, i) => {
      input.position = i + 1;
    });

    setBlocks(newBlocks);
  };

  const moveOption = (
    blockIndex: number,
    inputIndex: number,
    optionIndex: number,
    direction: "up" | "down",
  ) => {
    const options = blocks[blockIndex].inputs[inputIndex].options;
    if (
      (direction === "up" && optionIndex === 0) ||
      (direction === "down" && optionIndex === options.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? optionIndex - 1 : optionIndex + 1;
    [
      newBlocks[blockIndex].inputs[inputIndex].options[optionIndex],
      newBlocks[blockIndex].inputs[inputIndex].options[targetIndex],
    ] = [
      newBlocks[blockIndex].inputs[inputIndex].options[targetIndex],
      newBlocks[blockIndex].inputs[inputIndex].options[optionIndex],
    ];

    setBlocks(newBlocks);
  };

  if (!selectedProduct) {
    return (
      <Page
        title="Create New Bundle"
        backAction={{
          content: "Bundles",
          onAction: () => navigate("/app/bundles"),
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <EmptyState
                  heading="Create a new bundle"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Start by selecting a product from your catalog.</p>
                  <Button variant="primary" onClick={handleProductSelect}>
                    Select Product
                  </Button>
                </EmptyState>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Create New Bundle"
      backAction={{
        content: "Bundles",
        onAction: () => navigate("/app/bundles"),
      }}
    >
      <Layout>
        {actionData?.status === "error" && (
          <Layout.Section>
            <Banner tone="critical">{actionData.message}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Form method="post">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Banner tone="info">
                    Selected product: {selectedProduct.title}
                    <Button variant="plain" onClick={handleProductSelect}>
                      Change
                    </Button>
                  </Banner>
                  <input
                    type="hidden"
                    name="productId"
                    value={selectedProduct.id}
                  />

                  <TextField
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={(value) =>
                      setFormData({ ...formData, title: value })
                    }
                    autoComplete="off"
                  />
                  <TextField
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={(value) =>
                      setFormData({ ...formData, description: value })
                    }
                    multiline={3}
                    autoComplete="off"
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h2">
                      Bundle Blocks
                    </Text>
                    <Button onClick={addBlock}>Add Block</Button>
                  </InlineStack>

                  {blocks.map((block, blockIndex) => (
                    <Card key={blockIndex}>
                      <BlockStack gap="400">
                        <InlineStack align="space-between">
                          <Text variant="headingMd" as="h3">
                            Block {blockIndex + 1}
                          </Text>
                          <InlineStack gap="200">
                            <Button
                              icon={MenuVerticalIcon}
                              onClick={() => moveBlock(blockIndex, "up")}
                              disabled={blockIndex === 0}
                              variant="plain"
                            >
                              Move Up
                            </Button>
                            <Button
                              icon={MenuVerticalIcon}
                              onClick={() => moveBlock(blockIndex, "down")}
                              disabled={blockIndex === blocks.length - 1}
                              variant="plain"
                            >
                              Move Down
                            </Button>
                            <Button
                              icon={DeleteIcon}
                              onClick={() => removeBlock(blockIndex)}
                              tone="critical"
                              variant="plain"
                            />
                          </InlineStack>
                        </InlineStack>

                        <TextField
                          label="Title"
                          value={block.title}
                          onChange={(value) =>
                            updateBlock(blockIndex, "title", value)
                          }
                          autoComplete="off"
                        />
                        <TextField
                          label="Description"
                          value={block.description}
                          onChange={(value) =>
                            updateBlock(blockIndex, "description", value)
                          }
                          multiline={2}
                          autoComplete="off"
                        />

                        <BlockStack gap="400">
                          <InlineStack align="space-between">
                            <Text variant="headingMd" as="h4">
                              Inputs
                            </Text>
                            <Button onClick={() => addInput(blockIndex)}>
                              Add Input
                            </Button>
                          </InlineStack>

                          {block.inputs.map((input, inputIndex) => (
                            <Card key={inputIndex}>
                              <BlockStack gap="400">
                                <InlineStack align="space-between">
                                  <Text variant="headingMd" as="h5">
                                    Input {inputIndex + 1}
                                  </Text>
                                  <InlineStack gap="200">
                                    <Button
                                      icon={MenuVerticalIcon}
                                      onClick={() =>
                                        moveInput(blockIndex, inputIndex, "up")
                                      }
                                      disabled={inputIndex === 0}
                                      variant="plain"
                                    >
                                      Move Up
                                    </Button>
                                    <Button
                                      icon={MenuVerticalIcon}
                                      onClick={() =>
                                        moveInput(
                                          blockIndex,
                                          inputIndex,
                                          "down",
                                        )
                                      }
                                      disabled={
                                        inputIndex === block.inputs.length - 1
                                      }
                                      variant="plain"
                                    >
                                      Move Down
                                    </Button>
                                    <Button
                                      icon={DeleteIcon}
                                      onClick={() =>
                                        removeInput(blockIndex, inputIndex)
                                      }
                                      tone="critical"
                                      variant="plain"
                                    />
                                  </InlineStack>
                                </InlineStack>

                                <Select
                                  label="Input Type"
                                  options={inputTypes}
                                  value={input.type}
                                  onChange={(value) =>
                                    updateInput(
                                      blockIndex,
                                      inputIndex,
                                      "type",
                                      value,
                                    )
                                  }
                                />
                                <TextField
                                  label="Title"
                                  value={input.title}
                                  onChange={(value) =>
                                    updateInput(
                                      blockIndex,
                                      inputIndex,
                                      "title",
                                      value,
                                    )
                                  }
                                  autoComplete="off"
                                />
                                <TextField
                                  label="Description"
                                  value={input.description}
                                  onChange={(value) =>
                                    updateInput(
                                      blockIndex,
                                      inputIndex,
                                      "description",
                                      value,
                                    )
                                  }
                                  multiline={2}
                                  autoComplete="off"
                                />
                                <Checkbox
                                  label="Required"
                                  checked={input.required}
                                  onChange={(value) =>
                                    updateInput(
                                      blockIndex,
                                      inputIndex,
                                      "required",
                                      value,
                                    )
                                  }
                                />

                                {input.type !== "FILE" && (
                                  <BlockStack gap="400">
                                    <InlineStack align="space-between">
                                      <Text variant="headingMd" as="h6">
                                        Options
                                      </Text>
                                      <Button
                                        onClick={() =>
                                          addOption(blockIndex, inputIndex)
                                        }
                                      >
                                        Add Option
                                      </Button>
                                    </InlineStack>

                                    {input.options.map(
                                      (option, optionIndex) => (
                                        <Card key={option.id}>
                                          <BlockStack gap="400">
                                            <InlineStack align="space-between">
                                              <Text variant="headingMd" as="h6">
                                                Option {optionIndex + 1}
                                              </Text>
                                              <InlineStack gap="200">
                                                <Button
                                                  icon={MenuVerticalIcon}
                                                  onClick={() =>
                                                    moveOption(
                                                      blockIndex,
                                                      inputIndex,
                                                      optionIndex,
                                                      "up",
                                                    )
                                                  }
                                                  disabled={optionIndex === 0}
                                                  variant="plain"
                                                >
                                                  Move Up
                                                </Button>
                                                <Button
                                                  icon={MenuVerticalIcon}
                                                  onClick={() =>
                                                    moveOption(
                                                      blockIndex,
                                                      inputIndex,
                                                      optionIndex,
                                                      "down",
                                                    )
                                                  }
                                                  disabled={
                                                    optionIndex ===
                                                    input.options.length - 1
                                                  }
                                                  variant="plain"
                                                >
                                                  Move Down
                                                </Button>
                                                <Button
                                                  icon={DeleteIcon}
                                                  onClick={() =>
                                                    removeOption(
                                                      blockIndex,
                                                      inputIndex,
                                                      optionIndex,
                                                    )
                                                  }
                                                  tone="critical"
                                                  variant="plain"
                                                />
                                              </InlineStack>
                                            </InlineStack>

                                            <TextField
                                              label="Label"
                                              value={option.label}
                                              onChange={(value) =>
                                                updateOption(
                                                  blockIndex,
                                                  inputIndex,
                                                  optionIndex,
                                                  "label",
                                                  value,
                                                )
                                              }
                                              autoComplete="off"
                                            />

                                            <Select
                                              label="Price Type"
                                              options={[
                                                {
                                                  label: "Fixed Amount",
                                                  value: "fixed",
                                                },
                                                {
                                                  label: "Percentage",
                                                  value: "percentage",
                                                },
                                              ]}
                                              value={
                                                option.price?.type || "fixed"
                                              }
                                              onChange={(value) =>
                                                updateOption(
                                                  blockIndex,
                                                  inputIndex,
                                                  optionIndex,
                                                  "price.type",
                                                  value,
                                                )
                                              }
                                            />

                                            <TextField
                                              label={`Price ${option.price?.type === "percentage" ? "%" : ""}`}
                                              type="number"
                                              value={
                                                option.price?.value.toString() ||
                                                "0"
                                              }
                                              onChange={(value) =>
                                                updateOption(
                                                  blockIndex,
                                                  inputIndex,
                                                  optionIndex,
                                                  "price.value",
                                                  parseFloat(value),
                                                )
                                              }
                                              autoComplete="off"
                                            />

                                            {(input.type === "MULTI_SELECT" ||
                                              input.type === "ONE_SELECT") && (
                                              <TextField
                                                label="Max Quantity"
                                                type="number"
                                                value={
                                                  option.maxQuantity?.toString() ||
                                                  ""
                                                }
                                                onChange={(value) =>
                                                  updateOption(
                                                    blockIndex,
                                                    inputIndex,
                                                    optionIndex,
                                                    "maxQuantity",
                                                    value
                                                      ? parseInt(value)
                                                      : undefined,
                                                  )
                                                }
                                                autoComplete="off"
                                              />
                                            )}

                                            {input.type === "RADIO" && (
                                              <Checkbox
                                                label="Show File Upload"
                                                checked={
                                                  option.showFileUpload || false
                                                }
                                                onChange={(value) =>
                                                  updateOption(
                                                    blockIndex,
                                                    inputIndex,
                                                    optionIndex,
                                                    "showFileUpload",
                                                    value,
                                                  )
                                                }
                                              />
                                            )}
                                          </BlockStack>
                                        </Card>
                                      ),
                                    )}
                                  </BlockStack>
                                )}
                              </BlockStack>
                            </Card>
                          ))}
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  ))}
                </BlockStack>
              </Card>

              <input
                type="hidden"
                name="blocks"
                value={JSON.stringify(blocks)}
              />

              <Button variant="primary" submit>
                Create Bundle
              </Button>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
