import { Session } from "@shopify/shopify-api";

type SessionType = {
  onlineAccessInfo?: {
    associated_user?: {
      id?: string | number;
    };
  };
};

export function shouldShowPrice(session: SessionType | null): boolean {
  return !!session?.onlineAccessInfo?.associated_user?.id;
}

export function hidePriceForNonAuth(price: number | null, session: SessionType | null): number | null {
  return shouldShowPrice(session) ? price : null;
} 