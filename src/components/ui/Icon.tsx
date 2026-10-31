import Svg, { Path } from "react-native-svg";

export type IconName =
  | "search"
  | "bell"
  | "home"
  | "store"
  | "cart"
  | "orders"
  | "profile"
  | "food"
  | "fashion"
  | "phone"
  | "star"
  | "clock"
  | "pin"
  | "back"
  | "chevron"
  | "cleaning"
  | "beverages"
  | "groceries"
  | "bakery"
  | "baby"
  | "mic"
  | "filter"
  | "close"
  | "trash"
  | "minus"
  | "plus"
  | "grid"
  | "card"
  | "refer"
  | "help"
  | "logout"
  | "bank"
  | "cash"
  | "eye"
  | "eyeOff";

type IconProps = {
  name: IconName;
  size: number;
  color: string;
};

const paths: Record<IconName, string> = {
  search: "M10.8 3.8a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l4.2 4.2",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10Z",
  store: "M3 10h18l-2-7H5l-2 7Zm2 0v11h14V10M3 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0",
  cart: "M2.5 3h2l2.3 12.2h12.4L22 7H5M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01",
  orders: "M6 3h12a1 1 0 0 1 1 1v16H5V4a1 1 0 0 1 1-1Zm3 5h6M9 12h6M9 16h4",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0H4Z",
  food: "M6 3v7m4-7v7M8 10v11M16 3v18m0-18c3 3 3 7 0 9",
  fashion: "m4 8 4-4 4 2 4-2 4 4-3 3-2-2v11H8V9l-2 2-2-3Z",
  phone: "M7 2.5h10v19H7zM10 5h4m-2 13.5h.01",
  star: "m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9L12 2.8Z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v6l4 2",
  pin: "M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  back: "m15 18-6-6 6-6",
  chevron: "m9 18 6-6-6-6",
  cleaning: "M4 17h16l-2-5H8l-2 5Zm2 0-1 4m13-4 1 4M8 9l3-3m0 0L9 4m2 2 3 2m1-2 1-2",
  beverages: "M7 3h5v4l1 2v12H6V9l1-2V3Zm10 0v5l-1 2v11h3V10l-1-2V3M7 7h5m4 4h3",
  groceries: "m3 9 2 11h14l2-11H3Zm0 0 4-5h10l4 5M8 9l2 11m6-11-2 11",
  bakery: "m4 17 13-9 3 4-13 9-3-4Zm13-9 1-5m-5 8 1-5m-5 8 1-5m-5 8 1-5",
  baby: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-4 3-7 7-7s7 3 7 7M9 8h.01M15 8h.01",
  mic: "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-7-3a7 7 0 0 0 14 0M12 18v4m-4 0h8",
  filter: "M4 7h16M4 12h16M4 17h16M8 5v4m8 1v4m-5 1v4",
  close: "m6 6 12 12M18 6 6 18",
  trash: "M4 7h16m-10 4v7m4-7v7M5 7l1 14h12l1-14M9 7V4h6v3",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  refer: "M4 12a8 8 0 1 0 2.3-5.7L4 8m0-4v4h4m4-1v5l3 2",
  help: "M12 17h.01M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.9-1.7 1.3-1.7 2.7M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  logout: "M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7",
  bank: "m3 9 9-6 9 6M5 10v8m5-8v8m4-8v8m5-8v8M3 21h18M2 18h20",
  cash: "M3 6h18v12H3zM7 10h.01M17 14h.01M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  eyeOff: "m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.2 4.1M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1 0 2-.2 2.9-.5",
};

export function Icon({ name, size, color }: IconProps) {
  const filled = name === "home" || name === "profile";

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={paths[name]}
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 1.4 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
