import { useParams } from "react-router-dom";
import {
  Page,
  Layout,
  LegacyCard,
  FormLayout,
  TextField,
  Button,
  Select,
  ButtonGroup,
  Banner,
} from "@shopify/polaris";
import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedFetch } from "../../hooks";

export default function ProductConfiguration() {
  const { id } = useParams();
  const fetch = useAuthenticatedFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configuration, setConfiguration] = useState({
    sections: []
  });

  useEffect(() => {
    loadConfiguration();
  }, [id]);

  const loadConfiguration = async () => {
    try {
      const response = await fetch(`/api/product-configurations?productId=${id}`);
      const data = await response.json();
      if (data.product?.metafield?.value) {
        setConfiguration(JSON.parse(data.product.metafield.value));
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/product-configurations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: id,
          configuration,
        }),
      });
    } catch (error) {
      console.error("Error saving configuration:", error);
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Page
      title="Product Configuration"
      primaryAction={{
        content: "Save",
        onAction: handleSave,
        loading: saving
      }}
    >
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <ButtonGroup>
              <Button onClick={addSection}>Add Section</Button>
            </ButtonGroup>

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
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 