import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../../components/ui/Icon";
import { useCartStore } from "../../../features/cart/store";
import { getStoreById, stores } from "../../../features/stores/data";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function ProductDetailScreen() {
  const router = useRouter();
  const { productId, storeId } = useLocalSearchParams<{ productId: string; storeId: string }>();
  const addItem = useCartStore((state) => state.addItem);
  const itemCount = useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  const store = getStoreById(storeId ?? "");
  const product = stores.flatMap((item) => item.products.map((entry) => ({ ...entry, storeId: item.id })))
    .find((entry) => entry.id === productId && entry.storeId === storeId);

  if (!product || !store) {
    return (
      <SafeAreaView style={styles.screen}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>
        <Text style={styles.errorText}>Product not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>
        <Image resizeMode="cover" source={product.image} style={styles.productImage} />
        <Text style={styles.storeName}>{store.name}</Text>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.price}>{formatNaira(product.priceKobo)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => addItem({ productId: product.id, storeId: store.id, name: product.name, description: product.description, unitPriceKobo: product.priceKobo, image: product.image })}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Icon color={darkColors.white} name="cart" size={spacing.md} />
          <Text style={styles.addLabel}>Add to Cart</Text>
        </Pressable>
      </ScrollView>
      <Pressable accessibilityLabel={`Open cart, ${itemCount} items`} onPress={() => router.push("/(customer)/cart")} style={styles.cartFab}>
        <Icon color={darkColors.white} name="cart" size={spacing.lg} />
        {itemCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount > 99 ? "99+" : itemCount}</Text></View> : null}
      </Pressable>
    </SafeAreaView>
  );
}

function formatNaira(priceKobo: number) {
  return `₦${(priceKobo / 100).toLocaleString("en-NG")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { padding: spacing.md, paddingBottom: spacing.xxl },
  backButton: { width: spacing.exploreBackSize, height: spacing.exploreBackSize, marginBottom: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  productImage: { width: "100%", height: spacing.productDetailImageHeight, borderRadius: radius.md },
  storeName: { ...typography.storeCaption, marginTop: spacing.lg, color: darkColors.mutedText },
  productName: { ...typography.storeTitle, color: darkColors.white },
  category: { ...typography.storeBody, color: darkColors.mutedText },
  price: { ...typography.storeSection, marginTop: spacing.md, color: darkColors.white },
  addButton: { minHeight: spacing.buttonHeight, marginTop: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.button, backgroundColor: darkColors.primary },
  addLabel: { ...typography.button, color: darkColors.white },
  pressed: { opacity: 0.78 },
  cartFab: { position: "absolute", right: spacing.md, bottom: spacing.exploreCartFabBottom, width: spacing.storeFabSize, height: spacing.storeFabSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary, elevation: spacing.xs },
  cartBadge: { position: "absolute", top: 0, right: 0, minWidth: spacing.md, height: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.peach },
  cartBadgeText: { ...typography.homeCaption, color: darkColors.dark },
  errorText: { ...typography.storeSection, color: darkColors.white, textAlign: "center" },
});
