import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { BundleService } from "../services/bundle.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    console.log('Received proxy request for bundle:', { 
      url: request.url,
      params,
      headers: Object.fromEntries(request.headers)
    });

    if (!params.id) {
      return json({ error: "Product ID is required" }, { status: 400 });
    }

    const bundleService = new BundleService();
    const bundle = await bundleService.getBundleByProductId(params.id);
    
    if (!bundle) {
      console.log('Bundle not found for product:', params.id);
      return json({ error: "Bundle not found" }, { status: 404 });
    }

    console.log('Found bundle:', bundle);
    return json(bundle, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error("Failed to fetch bundle:", error);
    return json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    );
  }
} 