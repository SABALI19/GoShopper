import { Platform, ViewStyle } from "react-native";
import { lightColors } from "./colors";

export const shadows: Record<string, ViewStyle> = {
  card: Platform.select({
    ios: {
      shadowColor: lightColors.dark,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 3 },
    default: {},
  })!,
};
