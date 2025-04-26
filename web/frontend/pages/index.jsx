import {
  Page,
  Layout,
  LegacyCard,
  Button,
  Text,
  EmptyState
} from "@shopify/polaris";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Page title="Bundle Manager">
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <EmptyState
              heading="Manage Your Product Bundles"
              action={{
                content: "Create New Bundle",
                onAction: () => navigate("/bundles/new"),
              }}
              secondaryAction={{
                content: "View All Bundles",
                onAction: () => navigate("/bundles"),
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Create and manage product bundles with customizable options and pricing.</p>
            </EmptyState>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 