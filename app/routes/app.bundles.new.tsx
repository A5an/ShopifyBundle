import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirect,
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
import type { InputType, PriceModifier } from "../types/bundle";
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

interface OptionValue {
  id: string;
  label: string;
  variant?: {
    id: string;
    title?: string;
  };
  price?: {
    type: "fixed" | "percentage";
    value: number;
  };
  maxQuantity?: number;
  showFileUpload?: boolean;
}

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

  // Convert selectedVariants to options for TABLE type inputs
  blocksData.forEach((block: any) => {
    block.inputs.forEach((input: any) => {
      if (input.type === "TABLE" && input.selectedVariants) {
        input.options = input.selectedVariants.map((variantId: string) => ({
          id: variantId,
          label: variantId,
          price: { value: 0, type: "fixed" },
        }));
        delete input.selectedVariants;
      }
    });
  });

  try {
    const bundleService = new BundleService();
    await bundleService.createBundle({
      title,
      description,
      productId,
      isActive: true,
      blocks: blocksData,
    });
    return redirect("/app/bundles");
  } catch (error: any) {
    return json(
      { errors: error.message || "Failed to create bundle" },
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
        selectedVariants?: string[];
      }>;
    }>
  >([]);

  const inputTypes = [
    { label: "Table", value: "TABLE" },
    { label: "Multi Select", value: "MULTI_SELECT" },
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
      selectedVariants: [],
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

  const handleVariantSelection = (blockIndex: number, inputIndex: number) => {
    return (
      <Select
        label="Select variants"
        options={
          selectedProduct?.variants.map((variant, variantIndex: number) => ({
            label: variant.title,
            value: variant.id,
          })) || []
        }
        value={selectedProduct?.variants[0]?.id || ""}
        onChange={(selected: string) => {
          const newBlocks = [...blocks];
          const input = newBlocks[blockIndex].inputs[inputIndex];

          if (!input.selectedVariants) {
            input.selectedVariants = [];
          }

          // Add to selectedVariants if not already present
          if (!input.selectedVariants.includes(selected)) {
            input.selectedVariants.push(selected);

            // Also add to options for consistency
            const variant = selectedProduct?.variants.find(
              (v) => v.id === selected,
            );
            if (variant) {
              input.options.push({
                id: selected,
                label: variant.title,
                price: { value: 0, type: "fixed" },
              });
            }
          }

          setBlocks(newBlocks);
        }}
      />
    );
  };

  const renderInputOptions = (
    blockIndex: number,
    inputIndex: number,
    input: any,
  ) => {
    if (input.type === "TABLE") {
      return (
        <BlockStack gap="400">
          <Select
            label="Select variants (required)"
            options={
              selectedProduct?.variants.map((variant) => ({
                label: variant.title,
                value: variant.id,
              })) || []
            }
            value={input.selectedVariants?.[0] || ""}
            onChange={(selected: string) => {
              const newBlocks = [...blocks];
              const currentInput = newBlocks[blockIndex].inputs[inputIndex];

              if (!currentInput.selectedVariants) {
                currentInput.selectedVariants = [];
              }

              if (!currentInput.selectedVariants.includes(selected)) {
                currentInput.selectedVariants.push(selected);

                const variant = selectedProduct?.variants.find(
                  (v) => v.id === selected,
                );
                if (variant) {
                  currentInput.options.push({
                    id: selected,
                    label: variant.title,
                    price: { value: 0, type: "fixed" },
                  });
                }
              }

              setBlocks(newBlocks);
            }}
          />
          {input.selectedVariants && input.selectedVariants.length > 0 && (
            <BlockStack gap="200">
              <Text as="h6" variant="headingSm">
                Selected Variants:
              </Text>
              {input.selectedVariants.map((variantId: string, idx: number) => {
                const variant = selectedProduct?.variants.find(
                  (v) => v.id === variantId,
                );
                return variant ? (
                  <InlineStack key={variantId} align="space-between">
                    <Text as="span">{variant.title}</Text>
                    <Button
                      tone="critical"
                      variant="plain"
                      onClick={() => {
                        const newBlocks = [...blocks];
                        const currentInput =
                          newBlocks[blockIndex].inputs[inputIndex];
                        currentInput.selectedVariants =
                          currentInput.selectedVariants?.filter(
                            (id) => id !== variantId,
                          );
                        currentInput.options = currentInput.options.filter(
                          (opt) => opt.id !== variantId,
                        );
                        setBlocks(newBlocks);
                      }}
                    >
                      Remove
                    </Button>
                  </InlineStack>
                ) : null;
              })}
            </BlockStack>
          )}
        </BlockStack>
      );
    }

    if (["MULTI_SELECT", "RADIO"].includes(input.type)) {
      return (
        <BlockStack gap="400">
          {input.options.map((option: OptionValue, optionIndex: number) => (
            <Card key={option.id} padding="400">
              <BlockStack gap="400">
                <InlineStack gap="400" blockAlign="end">
                  {!(input.type === "MULTI_SELECT" && option.variant?.id) && (
                    <div style={{ flexGrow: 1 }}>
                      <TextField
                        label="Option Label"
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
                    </div>
                  )}
                  {input.type === "MULTI_SELECT" && (
                    <Select
                      label="Variant (optional)"
                      options={[
                        { label: "No variant", value: "" },
                        ...(selectedProduct?.variants?.map((variant) => ({
                          label: variant.title,
                          value: variant.id,
                        })) || []),
                      ]}
                      value={option.variant?.id || ""}
                      onChange={(value) =>
                        updateOption(
                          blockIndex,
                          inputIndex,
                          optionIndex,
                          "variant",
                          value ? { id: value } : undefined,
                        )
                      }
                    />
                  )}
                </InlineStack>

                {!(input.type === "MULTI_SELECT" && option.variant?.id) && (
                  <>
                    <InlineStack gap="200" blockAlign="end">
                      <Select
                        label="Price Type"
                        options={[
                          { label: "Fixed", value: "fixed" },
                          { label: "Percentage", value: "percentage" },
                        ]}
                        value={option.price?.type || "fixed"}
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
                        type="number"
                        label="Price Value"
                        value={(option.price?.value || 0).toString()}
                        onChange={(value) =>
                          updateOption(
                            blockIndex,
                            inputIndex,
                            optionIndex,
                            "price.value",
                            parseFloat(value) || 0,
                          )
                        }
                        autoComplete="off"
                      />
                    </InlineStack>

                    <InlineStack gap="400" blockAlign="end">
                      <TextField
                        type="number"
                        label="Max Quantity"
                        value={option.maxQuantity?.toString() || ""}
                        onChange={(value) =>
                          updateOption(
                            blockIndex,
                            inputIndex,
                            optionIndex,
                            "maxQuantity",
                            value ? parseInt(value) : undefined,
                          )
                        }
                        autoComplete="off"
                      />
                      <Checkbox
                        label="Show File Upload"
                        checked={option.showFileUpload || false}
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
                    </InlineStack>
                  </>
                )}

                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200">
                    <Button
                      disabled={optionIndex === 0}
                      onClick={() =>
                        moveOption(blockIndex, inputIndex, optionIndex, "up")
                      }
                    >
                      Move Up
                    </Button>
                    <Button
                      disabled={optionIndex === input.options.length - 1}
                      onClick={() =>
                        moveOption(blockIndex, inputIndex, optionIndex, "down")
                      }
                    >
                      Move Down
                    </Button>
                  </InlineStack>
                  <Button
                    icon={<Icon source={DeleteIcon} tone="critical" />}
                    onClick={() =>
                      removeOption(blockIndex, inputIndex, optionIndex)
                    }
                    variant="plain"
                    accessibilityLabel="Remove option"
                  />
                </InlineStack>
              </BlockStack>
            </Card>
          ))}
          <Button onClick={() => addOption(blockIndex, inputIndex)} fullWidth>
            Add Option
          </Button>
        </BlockStack>
      );
    }

    if (input.type === "FILE") {
      return (
        <Text as="p">
          File upload options are configured per-option in other input types.
        </Text>
      );
    }

    return null;
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

                                {renderInputOptions(
                                  blockIndex,
                                  inputIndex,
                                  input,
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
