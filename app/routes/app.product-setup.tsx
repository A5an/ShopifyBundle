import { Page } from "@shopify/polaris";
import { ProductSetup } from "../components/ProductSetup";
import { authenticate } from "../shopify.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  return { session };
}

export default function ProductSetupPage() {
  const { session } = useLoaderData<typeof loader>();

  return (
    <Page title="Product Setup">
      <ProductSetup session={session} />
    </Page>
  );
}
