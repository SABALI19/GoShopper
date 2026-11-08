import type { CartLine } from "./store";
import { minimumStoreSubtotalKobo } from "./config";

export type StoreCartSummary = {
  storeId: string;
  subtotalKobo: number;
  amountRemainingKobo: number;
  eligible: boolean;
  lines: CartLine[];
};

export function getStoreCartSummaries(lines: CartLine[]): StoreCartSummary[] {
  const grouped = new Map<string, CartLine[]>();
  for (const line of lines) {
    const storeLines = grouped.get(line.storeId) ?? [];
    storeLines.push(line);
    grouped.set(line.storeId, storeLines);
  }

  return Array.from(grouped, ([storeId, storeLines]) => {
    const subtotalKobo = storeLines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
    return {
      storeId,
      subtotalKobo,
      amountRemainingKobo: Math.max(0, minimumStoreSubtotalKobo - subtotalKobo),
      eligible: subtotalKobo >= minimumStoreSubtotalKobo,
      lines: storeLines,
    };
  });
}

export function getCartEligibility(lines: CartLine[]) {
  const stores = getStoreCartSummaries(lines);
  return {
    stores,
    eligible: stores.length > 0 && stores.every((store) => store.eligible),
    belowMinimum: stores.filter((store) => !store.eligible),
  };
}
