import { getStoreById } from "../stores/data";

export type ReorderLineRequest = {
  productId: string;
  quantity: number;
};

export type ReorderAvailabilityLine = {
  productId: string;
  requestedQuantity: number;
  availableQuantity: number;
  currentPriceKobo: number | null;
  status: "available" | "limited" | "unavailable";
  reason?: string;
};

export type ReorderAvailability = {
  orderId: string;
  storeId: string;
  storeName: string;
  checkedAt: string;
  lines: ReorderAvailabilityLine[];
  source: "demo";
};

// Temporary stock values for the local order/catalog demo. Replace this provider
// with the live server quote endpoint when its contract and URL are available.
const demoStockByStoreAndProduct: Record<string, number> = {
  "bokku-mart:mama-gold-rice": 1,
  "bokku-mart:baby-pampers": 0,
  "bokku-mart:groundnut-oil": 1,
};

export async function checkReorderAvailability(input: {
  orderId: string;
  storeId: string;
  lines: ReorderLineRequest[];
}): Promise<ReorderAvailability> {
  // Simulate a network round trip so the screen exercises its loading state.
  await new Promise((resolve) => setTimeout(resolve, 450));

  const store = getStoreById(input.storeId);
  const lines = input.lines.map((line): ReorderAvailabilityLine => {
    const product = store?.products.find((candidate) => candidate.id === line.productId);
    if (!product) {
      return {
        productId: line.productId,
        requestedQuantity: line.quantity,
        availableQuantity: 0,
        currentPriceKobo: null,
        status: "unavailable",
        reason: "This item is no longer listed by this store.",
      };
    }

    const availableQuantity = Math.max(
      0,
      Math.floor(demoStockByStoreAndProduct[`${input.storeId}:${line.productId}`] ?? line.quantity),
    );
    const status = availableQuantity === 0
      ? "unavailable"
      : availableQuantity < line.quantity
        ? "limited"
        : "available";

    return {
      productId: line.productId,
      requestedQuantity: line.quantity,
      availableQuantity: Math.min(availableQuantity, line.quantity),
      currentPriceKobo: product.priceKobo,
      status,
      reason: status === "unavailable"
        ? "Currently out of stock."
        : status === "limited"
          ? "Only part of the ordered quantity is available."
          : undefined,
    };
  });

  return {
    orderId: input.orderId,
    storeId: input.storeId,
    storeName: store?.name ?? "Store",
    checkedAt: new Date().toISOString(),
    lines,
    source: "demo",
  };
}
