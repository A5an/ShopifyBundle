import { prisma } from "../db.server";
import type { Session } from "@shopify/shopify-api";

export async function isB2BCustomer(session: Session | null): Promise<boolean> {
  if (!session?.onlineAccessInfo?.associated_user?.id) {
    return false;
  }

  const customer = await prisma.customer.findUnique({
    where: {
      shopifyId: session.onlineAccessInfo.associated_user.id.toString(),
    },
  });

  return customer?.isB2B ?? false;
}

export async function requireB2B(session: Session | null): Promise<void> {
  const isB2B = await isB2BCustomer(session);
  
  if (!isB2B) {
    throw new Response("B2B access required", { status: 403 });
  }
}

export function hidePriceForNonB2B(price: number | null, isB2B: boolean): number | null {
  return isB2B ? price : null;
} 