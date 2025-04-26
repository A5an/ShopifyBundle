import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  LegacyCard,
  ResourceList,
  ResourceItem,
  Text,
  Button,
  EmptyState,
} from "@shopify/polaris";
import { useAuthenticatedFetch } from "../../hooks";
import { useState, useEffect } from "react";

export default function BundlesList() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const response = await fetch("/api/bundles");
      const data = await response.json();
      setBundles(data.bundles || []);
    } catch (error) {
      console.error("Error loading bundles:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title="Product Bundles"
      primaryAction={{
        content: "Create Bundle",
        onAction: () => navigate("/bundles/new"),
      }}
    >
      <Layout>
        <Layout.Section>
          <LegacyCard>
            <ResourceList
              resourceName={{ singular: "Bundle", plural: "Bundles" }}
              items={bundles}
              loading={loading}
              emptyState={
                <EmptyState
                  heading="No bundles yet"
                  action={{
                    content: "Create Bundle",
                    onAction: () => navigate("/bundles/new"),
                  }}
                >
                  <p>Create your first product bundle to get started.</p>
                </EmptyState>
              }
              renderItem={(bundle) => (
                <ResourceItem
                  id={bundle.id}
                  onClick={() => navigate(`/bundles/${bundle.id}`)}
                >
                  <Text variant="bodyMd" fontWeight="bold" as="h3">
                    {bundle.title}
                  </Text>
                  <div style={{ color: "#637381", marginTop: "4px" }}>
                    {bundle.productsCount} products
                  </div>
                </ResourceItem>
              )}
            />
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 