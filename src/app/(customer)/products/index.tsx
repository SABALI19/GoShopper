import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../../components/ui/Icon";
import { useCartStore } from "../../../features/cart/store";
import { stores } from "../../../features/stores/data";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function ProductsScreen() {
  const router = useRouter();
  const { search } = useLocalSearchParams<{ search?: string }>();
  const { width } = useWindowDimensions();
  const itemCount = useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  const products = stores.flatMap((store) => store.products.map((product) => ({ ...product, store })));
  const visibleProducts = search
    ? products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()))
    : products;
  const cardWidth = (width - spacing.explorePageInset * 2 - spacing.exploreProductCardGap) / 2;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>
        {visibleProducts.length ? (
          <View style={styles.grid}>
            {visibleProducts.map(({ store, ...product }) => (
              <View key={`${store.id}-${product.id}`} style={[styles.card, { width: cardWidth }]}>
                <Pressable
                  accessibilityLabel={`View ${product.name}`}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/(customer)/product/[productId]", params: { productId: product.id, storeId: store.id } })}
                >
                  <Image source={product.image} style={styles.productImage} />
                  <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
                  <Text style={styles.price}>{formatNaira(product.priceKobo)}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => useCartStore.getState().addItem({
                    productId: product.id,
                    storeId: store.id,
                    name: product.name,
                    description: product.description,
                    unitPriceKobo: product.priceKobo,
                    image: product.image,
                  })}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Icon color={darkColors.white} name="cart" size={spacing.md} />
                  <Text style={styles.addLabel}>Add</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>Try another search or browse a store catalog.</Text>
          </View>
        )}
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
  page: { paddingHorizontal: spacing.explorePageInset, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  backButton: { width: spacing.exploreBackSize, height: spacing.exploreBackSize, marginBottom: spacing.lg, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.exploreProductCardGap, rowGap: spacing.exploreProductCardGap },
  card: { minHeight: spacing.exploreProductCardHeight, padding: spacing.exploreProductCardPadding, borderRadius: radius.md, backgroundColor: darkColors.storeCard },
  productImage: { width: "100%", height: spacing.exploreProductImageHeight, borderRadius: radius.md },
  productName: { ...typography.storeBody, color: darkColors.white },
  price: { ...typography.storeBody, marginTop: spacing.xxs, marginBottom: spacing.xs, color: darkColors.white },
  addButton: { minHeight: spacing.exploreProductAddHeight, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.sm, backgroundColor: darkColors.primary },
  addLabel: { ...typography.storeBody, color: darkColors.white, fontFamily: "Poppins_500Medium", fontWeight: "500" },
  pressed: { opacity: 0.78 },
  empty: { minHeight: spacing.xxl * 2, alignItems: "center", justifyContent: "center" },
  emptyTitle: { ...typography.storeSection, color: darkColors.white },
  emptyText: { ...typography.storeCaption, color: darkColors.mutedText, textAlign: "center" },
  cartFab: { position: "absolute", right: spacing.md, bottom: spacing.exploreCartFabBottom, width: spacing.storeFabSize, height: spacing.storeFabSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary, elevation: spacing.xs },
  cartBadge: { position: "absolute", top: 0, right: 0, minWidth: spacing.md, height: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.peach },
  cartBadgeText: { ...typography.homeCaption, color: darkColors.dark },
});
