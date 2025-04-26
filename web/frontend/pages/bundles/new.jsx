import {
  Page,
  Layout,
  LegacyCard,
  FormLayout,
  TextField,
  Button,
  Select,
  ResourcePicker,
  Banner,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedFetch } from "../../hooks";

export default function BundleCreate() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configuration, setConfiguration] = useState({
    sections: []
  });

  const handleProductSelect = useCallback(({ selection }) => {
    setSelectedProduct(selection[0]);
    setShowProductPicker(false);
  }, []);

  const addSection = () => {
    setConfiguration(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          type: "multi_select",
          title: "",
          description: "",
          options: []
        }
      ]
    }));
  };

  const addOption = (sectionIndex) => {
    const newSections = [...configuration.sections];
    newSections[sectionIndex].options.push({
      label: "",
      price: "0",
      stock: true
    });
    setConfiguration({ ...configuration, sections: newSections });
  };

  const updateSection = (index, field, value) => {
    const newSections = [...configuration.sections];
    newSections[index][field] = value;
    setConfiguration({ ...configuration, sections: newSections });
  };

  const updateOption = (sectionIndex, optionIndex, field, value) => {
    const newSections = [...configuration.sections];
    newSections[sectionIndex].options[optionIndex][field] = value;
    setConfiguration({ ...configuration, sections: newSections });
  };

  const handleSave = async () => {
    if (!selectedProduct) {
      alert("Please select a product first");
      return;
    }

    setSaving(true);
    try {
      await fetch("/api/product-configurations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          configuration,
        }),
      });
      navigate("/bundles");
    } catch (error) {
      console.error("Error saving bundle:", error);
      alert("Error saving bundle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="Create Bundle"
      breadcrumbs={[{ content: "Bundles", url: "/bundles" }]}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
        loading: saving,
        disabled: !selectedProduct
      }}
    >
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <FormLayout>
              <Button onClick={() => setShowProductPicker(true)}>
                {selectedProduct ? "Change Product" : "Select Product"}
              </Button>
              {selectedProduct && (
                <Banner status="info">
                  Selected product: {selectedProduct.title}
                </Banner>
              )}
            </FormLayout>
          </LegacyCard>

          {selectedProduct && (
            <LegacyCard sectioned>
              <FormLayout>
                <Button onClick={addSection}>Add Section</Button>

                {configuration.sections.map((section, sectionIndex) => (
                  <LegacyCard sectioned key={sectionIndex}>
                    <FormLayout>
                      <Select
                        label="Section Type"
                        options={[
                          {label: "Multi Select", value: "multi_select"},
                          {label: "Radio Buttons", value: "radio"},
                          {label: "Checkbox Group", value: "checkbox_group"},
                          {label: "Text Input", value: "text_input"},
                          {label: "File Upload", value: "file_upload"}
                        ]}
                        value={section.type}
                        onChange={(value) => updateSection(sectionIndex, "type", value)}
                      />
                      
                      <TextField
                        label="Title"
                        value={section.title}
                        onChange={(value) => updateSection(sectionIndex, "title", value)}
                      />
                      
                      <TextField
                        label="Description"
                        value={section.description}
                        multiline
                        onChange={(value) => updateSection(sectionIndex, "description", value)}
                      />

                      {["multi_select", "radio", "checkbox_group"].includes(section.type) && (
                        <>
                          <Button onClick={() => addOption(sectionIndex)}>Add Option</Button>
                          
                          {section.options.map((option, optionIndex) => (
                            <FormLayout key={optionIndex}>
                              <TextField
                                label="Option Label"
                                value={option.label}
                                onChange={(value) => updateOption(sectionIndex, optionIndex, "label", value)}
                              />
                              
                              <TextField
                                label="Price Adjustment"
                                type="number"
                                value={option.price}
                                onChange={(value) => updateOption(sectionIndex, optionIndex, "price", value)}
                                prefix="€"
                              />
                              
                              {section.type === "multi_select" && (
                                <Select
                                  label="Stock Status"
                                  options={[
                                    {label: "In Stock", value: "true"},
                                    {label: "Out of Stock", value: "false"}
                                  ]}
                                  value={option.stock.toString()}
                                  onChange={(value) => updateOption(sectionIndex, optionIndex, "stock", value === "true")}
                                />
                              )}
                            </FormLayout>
                          ))}
                        </>
                      )}
                    </FormLayout>
                  </LegacyCard>
                ))}
              </FormLayout>
            </LegacyCard>
          )}
        </Layout.Section>
      </Layout>

      {showProductPicker && (
        <ResourcePicker
          resourceType="Product"
          showVariants={false}
          selectMultiple={false}
          onCancel={() => setShowProductPicker(false)}
          onSelection={handleProductSelect}
          open
        />
      )}
    </Page>
  );
} 