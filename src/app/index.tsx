import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { GoShopperBag } from "../components/GoShopperBag";
import { lightColors, radius, spacing, typography } from "../theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SplashScreen() {
  if (!publishableKey) {
    return <SplashContent destination="/(auth)/login" ready />;
  }

  return <ClerkSplash />;
}

function ClerkSplash() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const role = user?.publicMetadata.role;
  const destination = !isSignedIn
    ? "/(auth)/login"
    : role === "supermarket"
      ? "/(supermarket)/(tabs)"
      : role === "admin"
        ? "/(admin)"
        : role === "rider"
          ? "/(rider)/(tabs)"
        : "/(customer)/(tabs)";

  return <SplashContent destination={destination} ready={isLoaded && (!isSignedIn || userLoaded)} />;
}

function SplashContent({
  destination,
  ready,
}: {
  destination: "/(auth)/login" | "/(customer)/(tabs)" | "/(supermarket)/(tabs)" | "/(admin)" | "/(rider)/(tabs)";
  ready: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => {
      router.replace(destination as never);
    }, 1500);

    return () => clearTimeout(timer);
  }, [destination, ready, router]);

  if (!ready) return null;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.brand}>
        <GoShopperBag size={100} />
        <Text style={styles.brandName}>Go-Shopper</Text>
        <Text style={styles.subheading}>
          Shop from your favorite stores - delivered to your doorstep
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressDot} />
      </View>
      <Text style={styles.loadingLabel}>Loading....</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightColors.primary,
  },
  brand: {
    position: "absolute",
    top: `${spacing.splashBrandTopPercent}%`,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: spacing.lg,
  },
  brandName: {
    ...typography.brandName,
    marginTop: spacing.md,
    color: lightColors.white,
    textAlign: "center",
  },
  subheading: {
    ...typography.subheading,
    marginTop: spacing.splashSubtitleTop,
    color: lightColors.white,
    textAlign: "center",
  },
  progressTrack: {
    position: "absolute",
    left: spacing.progressTrackInset,
    right: spacing.progressTrackInset,
    bottom: `${spacing.progressBottomPercent}%`,
    height: spacing.progressTrackHeight,
    borderRadius: radius.progress,
    justifyContent: "center",
    backgroundColor: lightColors.peach,
  },
  progressDot: {
    marginLeft: spacing.progressDotOffset,
    width: spacing.progressDotSize,
    height: spacing.progressDotSize,
    borderRadius: spacing.progressDotSize / 2,
    backgroundColor: lightColors.white,
  },
  loadingLabel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: `${spacing.splashLoadingBottomPercent}%`,
    ...typography.loadingLabel,
    color: lightColors.white,
    textAlign: "center",
  },
});
