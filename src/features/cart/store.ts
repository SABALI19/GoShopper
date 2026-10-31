import { create } from "zustand";
import type { ImageSourcePropType } from "react-native";

export type CartLine = {
  productId: string;
  storeId: string;
  name: string;
  unitPriceKobo: number;
  image: ImageSourcePropType;
  description?: string;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "quantity">) => void;
  addItems: (lines: CartLine[]) => void;
  setQuantity: (productId: string, storeId: string, quantity: number) => void;
  removeItem: (productId: string, storeId: string) => void;
};

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  addItem: (newLine) => set((state) => {
    const existing = state.lines.find(
      (line) => line.productId === newLine.productId && line.storeId === newLine.storeId,
    );
    if (!existing) return { lines: [...state.lines, { ...newLine, quantity: 1 }] };
    return {
      lines: state.lines.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line),
    };
  }),
  addItems: (newLines) => set((state) => {
    const lines = [...state.lines];
    for (const newLine of newLines) {
      const existingIndex = lines.findIndex(
        (line) => line.productId === newLine.productId && line.storeId === newLine.storeId,
      );
      if (existingIndex < 0) {
        lines.push({ ...newLine, quantity: Math.max(1, Math.floor(newLine.quantity)) });
      } else {
        const existingLine = lines[existingIndex];
        lines[existingIndex] = {
          ...existingLine,
          ...newLine,
          quantity: existingLine.quantity + Math.max(1, Math.floor(newLine.quantity)),
        };
      }
    }
    return { lines };
  }),
  setQuantity: (productId, storeId, quantity) => set((state) => ({
    lines: state.lines.map((line) => line.productId === productId && line.storeId === storeId
      ? { ...line, quantity: Math.max(1, Math.floor(quantity)) }
      : line),
  })),
  removeItem: (productId, storeId) => set((state) => ({
    lines: state.lines.filter((line) => line.productId !== productId || line.storeId !== storeId),
  })),
}));
