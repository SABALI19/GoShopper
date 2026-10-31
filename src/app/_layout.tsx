import { Stack } from "expo-router";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const routes = <Stack screenOptions={{ headerShown: false }} />;

  if (!publishableKey) return routes;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {routes}
    </ClerkProvider>
  );
}
