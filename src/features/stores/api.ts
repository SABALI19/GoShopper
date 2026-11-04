import type { StoreInfo } from "./data";
import { apiBaseUrl, apiRequest } from "../api/client";

type StoreDto = {
  id?: string;
  slug: string;
  name: string;
  category: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  rating?: number;
  categories?: string[];
  brandValues?: string[];
  openHours?: string;
};

function toStoreInfo(store: StoreDto): StoreInfo {
  return {
    id: store.id || store.slug,
    name: store.name,
    category: store.category,
    logo: store.logoUrl ? { uri: store.logoUrl } : require("../../../assets/images/home/store-bokku.png"),
    cover: store.coverImageUrl ? { uri: store.coverImageUrl } : undefined,
    rating: store.rating ? store.rating.toFixed(1) : undefined,
    tagline: store.tagline,
    openHours: store.openHours,
    products: [],
    categories: store.categories || [],
    overview: store.description,
    brandValues: store.brandValues || [],
  };
}

export async function fetchStores(): Promise<StoreInfo[] | null> {
  if (!apiBaseUrl) return null;
  const result = await apiRequest<{ stores: StoreDto[] }>("/api/stores");
  return result.stores.map(toStoreInfo);
}

export async function fetchStore(storeId: string): Promise<StoreInfo | null> {
  if (!apiBaseUrl) return null;
  const result = await apiRequest<{ store: StoreDto }>(`/api/stores/${encodeURIComponent(storeId)}`);
  return toStoreInfo(result.store);
}

export async function fetchStoreProducts(storeId: string) {
  if (!apiBaseUrl) return null;
  const result = await apiRequest<{ products: {
    id?: string;
    productKey: string;
    name: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    priceKobo: number;
  }[] }>(`/api/stores/${encodeURIComponent(storeId)}/products`);
  return result.products.map((product) => ({
    id: product.id || product.productKey,
    name: product.name,
    description: product.description,
    category: product.category || "",
    image: product.imageUrl ? { uri: product.imageUrl } : require("../../../assets/images/store/bokku-rice.png"),
    priceKobo: product.priceKobo,
  }));
}
