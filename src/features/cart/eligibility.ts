import type { CartLine } from "./store";

export type StoreCartSummary = {
  storeId: string;
  subtotalKobo: number;
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
    return { storeId, subtotalKobo, lines: storeLines };
  });
}

export function getCartEligibility(lines: CartLine[]) {
  const stores = getStoreCartSummaries(lines);
  return {
    stores,
  };
}
