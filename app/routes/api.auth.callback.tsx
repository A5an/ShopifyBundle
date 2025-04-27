import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return redirect("/app");
  } catch (error: any) {
    console.error("Error in auth callback:", error);
    if (error instanceof Response) {
      throw error;
    }
    return redirect("/auth/login");
  }
};
