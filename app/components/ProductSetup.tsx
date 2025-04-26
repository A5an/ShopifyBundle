import { useState } from "react";
import {
  Card,
  TextField,
  ChoiceList,
  Button,
  DropZone,
  Box,
  Text,
  FormLayout,
  BlockStack,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

type SessionType = {
  onlineAccessInfo?: {
    associated_user?: {
      id?: string | number;
    };
  };
};

export function ProductSetup({ session }: { session: SessionType | null }) {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [singleOption, setSingleOption] = useState<string[]>([]);
  const [singleOptionPrice, setSingleOptionPrice] = useState("");
  const [additionalOptions, setAdditionalOptions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const sizes = [
    { label: "S", value: "S" },
    { label: "M", value: "M" },
    { label: "L", value: "L" },
    { label: "XL", value: "XL" },
  ];

  const additionalOptionsList = [
    { label: "Option 1", value: "option1" },
    { label: "Option 2", value: "option2" },
    { label: "Option 3", value: "option3" },
  ];

  const showPrice = !!session?.onlineAccessInfo?.associated_user?.id;

  const handleDropZoneDrop = (_dropFiles: File[], acceptedFiles: File[]) => {
    setFiles((files) => [...files, ...acceptedFiles]);
  };

  const renderPriceField = () => {
    if (!showPrice) {
      return (
        <Banner tone="info">
          <Text as="p">Please log in to see prices and make purchases.</Text>
          <Button url="/auth/login" variant="primary">
            Log in
          </Button>
        </Banner>
      );
    }

    return (
      <TextField
        label="Price"
        type="number"
        prefix="€"
        value={singleOptionPrice}
        onChange={setSingleOptionPrice}
        autoComplete="off"
      />
    );
  };

  return (
    <BlockStack gap="500">
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Size Selection
            </Text>
            <FormLayout>
              <ChoiceList
                allowMultiple
                title="Select sizes"
                choices={sizes}
                selected={selectedSizes}
                onChange={setSelectedSizes}
              />
              {selectedSizes.map((size) => (
                <TextField
                  key={size}
                  label={`Quantity for size ${size}`}
                  type="number"
                  value={quantities[size]?.toString() || ""}
                  onChange={(value) =>
                    setQuantities((prev) => ({
                      ...prev,
                      [size]: parseInt(value),
                    }))
                  }
                  autoComplete="off"
                />
              ))}
            </FormLayout>
          </BlockStack>
        </Box>
      </Card>

      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Special Option
            </Text>
            <ChoiceList
              title="Single Choice Option"
              choices={[
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
              selected={singleOption}
              onChange={setSingleOption}
            />
            {singleOption.includes("yes") && renderPriceField()}
          </BlockStack>
        </Box>
      </Card>

      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Additional Options
            </Text>
            <ChoiceList
              allowMultiple
              title="Select additional options"
              choices={additionalOptionsList}
              selected={additionalOptions}
              onChange={setAdditionalOptions}
            />
          </BlockStack>
        </Box>
      </Card>

      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Upload Photos
            </Text>
            <DropZone onDrop={handleDropZoneDrop} allowMultiple>
              <DropZone.FileUpload />
            </DropZone>
            {files.length > 0 && (
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Files uploaded:
                </Text>
                <InlineStack gap="200" wrap>
                  {files.map((file, index) => (
                    <Text key={index} as="span" variant="bodyMd">
                      {file.name}
                    </Text>
                  ))}
                </InlineStack>
              </BlockStack>
            )}
          </BlockStack>
        </Box>
      </Card>

      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Notes
            </Text>
            <TextField
              label="Additional Notes"
              value={notes}
              onChange={setNotes}
              autoComplete="off"
              multiline={4}
            />
          </BlockStack>
        </Box>
      </Card>

      <Button variant="primary" fullWidth url="/app/quote-form">
        Devis ajouter
      </Button>
    </BlockStack>
  );
}
