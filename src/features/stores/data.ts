import type { ImageSourcePropType } from "react-native";

export type StoreProduct = {
  id: string;
  name: string;
  priceKobo: number;
  image: ImageSourcePropType;
  category: string;
  description?: string;
};

export type StoreInfo = {
  id: string;
  name: string;
  category: string;
  logo: ImageSourcePropType;
  rating?: string;
  tagline?: string;
  cover?: ImageSourcePropType;
  openHours?: string;
  distance?: string;
  products: StoreProduct[];
  categories: string[];
  overview?: string;
  brandValues?: string[];
  showOnHome?: boolean;
};

export const stores: StoreInfo[] = [
  {
    id: "home-comforts",
    name: "Home Comforts",
    category: "Home",
    logo: require("../../../assets/images/home/store-home-comforts.png"),
    rating: "4.8",
    products: [],
    categories: [],
  },
  {
    id: "fashion-hub",
    name: "Fashion Hub",
    category: "Fashion",
    logo: require("../../../assets/images/explore/store-fashion.png"),
    products: [],
    categories: [],
    showOnHome: false,
  },
  {
    id: "wine-store",
    name: "Wine Store",
    category: "Food",
    logo: require("../../../assets/images/explore/store-wine.png"),
    products: [],
    categories: [],
    showOnHome: false,
  },
  {
    id: "food-mart",
    name: "Food Mart",
    category: "Food",
    logo: require("../../../assets/images/explore/store-food-mart.png"),
    products: [],
    categories: [],
    showOnHome: false,
  },
  {
    id: "fresh-mart",
    name: "Fresh Mart",
    category: "Food",
    logo: require("../../../assets/images/home/store-fresh-mart.png"),
    rating: "4.8",
    products: [],
    categories: [],
  },
  {
    id: "style-hub",
    name: "Style Hub",
    category: "Fashion",
    logo: require("../../../assets/images/home/store-style-hub.png"),
    rating: "4.8",
    products: [],
    categories: [],
  },
  {
    id: "jumia",
    name: "Jumia",
    category: "Electronics",
    logo: require("../../../assets/images/home/store-jumia.png"),
    rating: "4.8",
    products: [],
    categories: [],
  },
  {
    id: "bokku-mart",
    name: "bokku! Mart",
    category: "Food",
    logo: require("../../../assets/images/home/store-bokku.png"),
    rating: "4.8",
    tagline: "Your go to for food items",
    cover: require("../../../assets/images/store/bokku-cover.png"),
    openHours: "Open 9am – 9pm",
    distance: "1.2km away",
    products: [
      { id: "mama-gold-rice", name: "Mama Gold Rice", priceKobo: 4_000_000, image: require("../../../assets/images/store/bokku-rice.png"), category: "Groceries", description: "50kg" },
      { id: "groundnut-oil", name: "Groundnut Oil", priceKobo: 150_000, image: require("../../../assets/images/store/bokku-oil.png"), category: "Groceries", description: "1 liter" },
      { id: "golden-penny-semovita", name: "Golden Penny Semovita", priceKobo: 150_000, image: require("../../../assets/images/store/bokku-semovita.png"), category: "Groceries" },
      { id: "red-wine", name: "Red wine", priceKobo: 150_000, image: require("../../../assets/images/store/bokku-wine.png"), category: "Beverages" },
      { id: "baby-pampers", name: "Pampers", priceKobo: 1_500_000, image: require("../../../assets/images/store/bokku-pampers.png"), category: "Baby & Kids", description: "Baby care size 19" },
      { id: "fruits-tray", name: "Fruits Tray", priceKobo: 1_050_000, image: require("../../../assets/images/store/bokku-fruits.png"), category: "Groceries" },
      { id: "yam", name: "Yam", priceKobo: 150_000, image: require("../../../assets/images/store/bokku-yam.png"), category: "Groceries" },
      { id: "titus-sardine", name: "Titus Sardine", priceKobo: 95_000, image: require("../../../assets/images/store/bokku-sardine.png"), category: "Groceries" },
    ],
    categories: ["Cleaning & Detergents", "Beverages", "Groceries", "Bakery", "Baby & Kids"],
    overview: "Bokku! Mart is a community-focused retail store offering essential groceries, household items, and everyday products at affordable prices. Known for its convenient locations and low prices, Bokku! Mart provides a simple and reliable shopping experience for customers looking to stock up on quality essentials.",
    brandValues: ["Sustainable Practices", "Community Focused", "Locally Sourced", "Quality First"],
  },
  {
    id: "food-co",
    name: "Food Co",
    category: "Food",
    logo: require("../../../assets/images/home/store-foodco.png"),
    rating: "4.8",
    products: [],
    categories: [],
  },
  {
    id: "justrite",
    name: "Justrite",
    category: "Food",
    logo: require("../../../assets/images/home/store-justrite.png"),
    rating: "4.8",
    products: [],
    categories: [],
  },
  {
    id: "gadget-world",
    name: "Gadget World",
    category: "Electronics",
    logo: require("../../../assets/images/home/store-gadget-world.png"),
    rating: "4.8",
    products: [],
    categories: [],
  },
];

export function getStoreById(storeId: string) {
  return stores.find((store) => store.id === storeId);
}
