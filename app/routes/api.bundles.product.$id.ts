import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { BundleService } from "../services/bundle.server";
import { prisma } from "../db.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    console.log('Received bundle request:', { 
      url: request.url,
      params,
      method: request.method,
      headers: Object.fromEntries(request.headers)
    });

    if (!params.id) {
      console.log('No product ID provided');
      return json({ error: "Product ID is required" }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Log all bundles in the database to help debug
    const allBundles = await prisma.bundle.findMany({
      select: {
        id: true,
        productId: true,
        title: true
      }
    });
    console.log('All bundles in database:', allBundles);
    console.log('Looking for bundle with productId:', params.id);

    const bundleService = new BundleService();
    const bundle = await bundleService.getBundleByProductId(params.id);
    
    if (!bundle) {
      console.log('Bundle not found for product:', params.id);
      return json({ error: "Bundle not found" }, { 
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Found bundle:', bundle);
    return json(bundle, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept'
      }
    });
  } catch (error) {
    console.error("Failed to fetch bundle:", error);
    return json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 