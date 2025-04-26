import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  LegacyCard,
  ResourceList,
  ResourceItem,
  Text,
} from "@shopify/polaris";
import { useAuthenticatedFetch } from "../../hooks";
import { useState, useEffect } from "react";

export default function ProductsList() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Products">
      <Layout>
        <Layout.Section>
          <LegacyCard>
            <ResourceList
              resourceName={{ singular: "Product", plural: "Products" }}
              items={products}
              loading={loading}
              renderItem={(product) => (
                <ResourceItem
                  id={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <Text variant="bodyMd" fontWeight="bold" as="h3">
                    {product.title}
                  </Text>
                </ResourceItem>
              )}
            />
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 