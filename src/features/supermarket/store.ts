import { create } from "zustand";
import type { ManagedStore } from "./api";

type SupermarketState = {
  stores: ManagedStore[];
  selectedStoreId: string | null;
  setStores: (stores: ManagedStore[]) => void;
  selectStore: (storeId: string) => void;
  clearStores: () => void;
};

export const useSupermarketStore = create<SupermarketState>((set) => ({
  stores: [],
  selectedStoreId: null,
  setStores: (stores) => set((state) => ({
    stores,
    selectedStoreId: stores.some((store) => store.id === state.selectedStoreId)
      ? state.selectedStoreId
      : stores[0]?.id ?? null,
  })),
  selectStore: (selectedStoreId) => set((state) => state.stores.some((store) => store.id === selectedStoreId)
    ? { selectedStoreId }
    : state),
  clearStores: () => set({ stores: [], selectedStoreId: null }),
}));
