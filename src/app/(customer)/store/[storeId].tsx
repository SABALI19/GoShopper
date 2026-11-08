import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { useCartStore } from "../../../features/cart/store";
import { getStoreById, type StoreInfo } from "../../../features/stores/data";
import { fetchStore, fetchStoreProducts } from "../../../features/stores/api";
import { darkColors, radius, spacing, typography } from "../../../theme";

type StoreTab = "All Products" | "Categories" | "About Store";
const tabs: StoreTab[] = ["All Products", "Categories", "About Store"];

export default function StoreScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const localStore = getStoreById(storeId ?? "");
  const [remoteStore, setRemoteStore] = useState<StoreInfo | null>(null);
  const [remoteProducts, setRemoteProducts] = useState<StoreInfo["products"] | null>(null);
  const refreshStore = useCallback(async () => {
    if (!storeId) return;
    const [storeResult, productResult] = await Promise.all([
      fetchStore(storeId),
      fetchStoreProducts(storeId),
    ]);
    if (storeResult) setRemoteStore(storeResult);
    if (productResult) setRemoteProducts(productResult);
  }, [storeId]);

  useEffect(() => {
    void Promise.resolve().then(refreshStore).catch((error) => {
      if (__DEV__) console.warn("Could not load store catalog from Go-Shopper API", error);
    });
  }, [refreshStore]);
  const store = remoteStore ?? localStore;
  const { width } = useWindowDimensions();
  const addItem = useCartStore((state) => state.addItem);
  const itemCount = useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  const [selectedTab, setSelectedTab] = useState<StoreTab>("All Products");
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);

  const productWidth = useMemo(
    () => (width - spacing.storePageInset * 2 - spacing.storeProductGap) / 2,
    [width],
  );
  const visibleProducts = selectedProductCategory
    ? (remoteProducts ?? store?.products)?.filter((product) => product.category === selectedProductCategory) ?? []
    : remoteProducts ?? store?.products ?? [];

  if (!store) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.missingStore}>
          <Text style={styles.sectionTitle}>Store not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Icon color={darkColors.white} name="back" size={spacing.lg} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <RefreshableScrollView contentContainerStyle={styles.page} refreshAction={refreshStore} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>

        <View style={styles.hero}>
          {store.cover ? (
            <Image resizeMode="cover" source={store.cover} style={styles.cover} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Image resizeMode="contain" source={store.logo} style={styles.placeholderLogo} />
            </View>
          )}
          <View style={styles.storeIdentity}>
            <Image resizeMode="cover" source={store.logo} style={styles.storeLogo} />
            <View style={styles.identityCopy}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text numberOfLines={2} style={styles.tagline}>
                {store.tagline ?? `${store.category} store`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StoreStat icon="star" label={store.rating ? `${store.rating} Stars` : "Not rated"} />
          <StoreStat icon="clock" label={store.openHours ?? "Store hours unavailable"} />
          <StoreStat icon="pin" label={store.distance ?? "Delivery available"} />
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = selectedTab === tab;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={[styles.tab, active && styles.activeTab]}
              >
                <Text numberOfLines={1} style={[styles.tabText, active && styles.activeTabText]}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedTab === "All Products" ? (
          visibleProducts.length > 0 ? (
            <View style={styles.productGrid}>
              {visibleProducts.map((product) => (
                <View key={product.id} style={[styles.productCard, { width: productWidth }]}>
                  <Image resizeMode="cover" source={product.image} style={styles.productImage} />
                  <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{formatNaira(product.priceKobo)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => addItem({
                      productId: product.id,
                      storeId: store.id,
                      storeName: store.name,
                      name: product.name,
                      description: product.description,
                      unitPriceKobo: product.priceKobo,
                      image: product.image,
                    })}
                    style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                  >
                    <Icon color={darkColors.white} name="cart" size={spacing.md} />
                    <Text style={styles.addButtonText}>Add</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <StoreEmpty text="This store’s products will appear here when its catalog is available." />
          )
        ) : null}

        {selectedTab === "Categories" ? (
          store.categories.length > 0 ? (
            <View style={styles.categoryList}>
              {store.categories.map((category, index) => (
                <Pressable key={category} onPress={() => { setSelectedProductCategory(category); setSelectedTab("All Products"); }} style={styles.categoryRow}>
                  <View style={styles.categoryLabel}>
                    <Icon color={darkColors.primary} name={categoryIcon(index)} size={spacing.md} />
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                  <Icon color={darkColors.white} name="chevron" size={spacing.md} />
                </Pressable>
              ))}
            </View>
          ) : (
            <StoreEmpty text="Categories will appear here when this store’s catalog is available." />
          )
        ) : null}

        {selectedTab === "About Store" ? (
          store.overview ? (
            <View style={styles.aboutContent}>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutHeading}>Store Overview</Text>
                <Text style={styles.aboutText}>{store.overview}</Text>
              </View>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutHeading}>What They Sell</Text>
                {store.categories.map((category) => <Text key={category} style={styles.bullet}>•  {category.replace("Cleaning & Detergents", "Cleaning Supplies")}</Text>)}
                <Text style={styles.bullet}>•  Personal Care</Text>
              </View>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutHeading}>Brand Value</Text>
                {store.brandValues?.map((value) => <Text key={value} style={styles.valueText}>{value}</Text>)}
              </View>
            </View>
          ) : (
            <StoreEmpty text="Store information will appear here when it has been provided." />
          )
        ) : null}
      </RefreshableScrollView>

      <Pressable accessibilityLabel={`Open cart, ${itemCount} items`} onPress={() => router.push("/(customer)/cart")} style={styles.cartFab}>
        <Icon color={darkColors.white} name="cart" size={spacing.lg} />
        {itemCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount > 99 ? "99+" : itemCount}</Text></View> : null}
      </Pressable>
    </SafeAreaView>
  );
}

function StoreStat({ icon, label }: { icon: "star" | "clock" | "pin"; label: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}><Icon color={darkColors.primary} name={icon} size={spacing.lg} /></View>
      <Text numberOfLines={2} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StoreEmpty({ text }: { text: string }) {
  return <View style={styles.emptyPanel}><Text style={styles.emptyText}>{text}</Text></View>;
}

function formatNaira(priceKobo: number) {
  return `₦${(priceKobo / 100).toLocaleString("en-NG")}`;
}

function categoryIcon(index: number): IconName {
  return ["cleaning", "beverages", "groceries", "bakery", "baby"][index % 5] as IconName;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.storePageInset, paddingBottom: spacing.xxl },
  backButton: {
    width: spacing.lg + spacing.xs,
    height: spacing.lg + spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.round,
    backgroundColor: darkColors.primary,
  },
  hero: { height: spacing.storeHeroHeight, marginBottom: spacing.xl },
  cover: { width: "100%", height: spacing.storeHeroHeight, borderRadius: radius.sm },
  coverPlaceholder: {
    width: "100%",
    height: spacing.storeHeroHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: darkColors.storeSurface,
  },
  placeholderLogo: { width: "70%", height: "75%" },
  storeIdentity: {
    position: "absolute",
    left: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  storeLogo: {
    width: spacing.storeLogoSize,
    height: spacing.storeLogoSize,
    borderRadius: radius.md,
    backgroundColor: darkColors.storeSurface,
  },
  identityCopy: { flex: 1, paddingBottom: spacing.xs },
  storeName: { ...typography.storeTitle, color: darkColors.white },
  tagline: { ...typography.storeBody, color: darkColors.white },
  statsRow: { flexDirection: "row", gap: spacing.storeStatsGap, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    minHeight: spacing.storeStatHeight,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: darkColors.storeSurface,
  },
  statIcon: {
    width: spacing.xxl,
    height: spacing.xxl,
    marginBottom: spacing.xxs,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.round,
    backgroundColor: darkColors.white,
  },
  statLabel: { ...typography.storeCaption, color: darkColors.white, textAlign: "center" },
  tabBar: { flexDirection: "row", height: spacing.storeTabHeight, marginBottom: spacing.lg, borderBottomWidth: spacing.storeTabBorderWidth, borderBottomColor: darkColors.storeSurface },
  tab: { flex: 1, justifyContent: "center", alignItems: "center", borderBottomWidth: spacing.storeTabBorderWidth, borderBottomColor: darkColors.storeTransparent },
  activeTab: { borderBottomColor: darkColors.primary },
  tabText: { ...typography.storeBody, color: darkColors.white },
  activeTabText: { fontFamily: "Poppins_700Bold", fontWeight: "700" },
  productGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.storeProductGap, rowGap: spacing.storeProductGap },
  productCard: { overflow: "hidden", padding: spacing.xs, borderRadius: radius.md, backgroundColor: darkColors.storeCard },
  productImage: { width: "100%", height: spacing.storeProductImageHeight, borderRadius: radius.sm },
  productName: { ...typography.storeBody, color: darkColors.white },
  productPrice: { ...typography.storeBody, marginTop: spacing.xxs, marginBottom: spacing.xs, color: darkColors.white },
  addButton: { minHeight: spacing.storeAddHeight, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.sm, backgroundColor: darkColors.primary },
  addButtonText: { ...typography.storeBody, color: darkColors.white, fontFamily: "Poppins_500Medium", fontWeight: "500" },
  pressed: { opacity: 0.78 },
  categoryList: { gap: spacing.xs },
  categoryRow: { minHeight: spacing.xl, paddingHorizontal: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  categoryLabel: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  categoryText: { ...typography.storeBody, color: darkColors.white },
  aboutContent: { gap: spacing.lg },
  aboutCard: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  aboutHeading: { ...typography.storeBody, marginBottom: spacing.xs, color: darkColors.white, fontFamily: "Poppins_500Medium", fontWeight: "500" },
  aboutText: { ...typography.storeCaption, color: darkColors.white },
  bullet: { ...typography.storeCaption, marginLeft: spacing.xs, color: darkColors.white },
  valueText: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.white },
  emptyPanel: { minHeight: spacing.xxl * 2, padding: spacing.lg, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  emptyText: { ...typography.storeBody, color: darkColors.mutedText, textAlign: "center" },
  cartFab: { position: "absolute", right: spacing.md, bottom: spacing.md, width: spacing.storeFabSize, height: spacing.storeFabSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary, elevation: spacing.xs },
  cartBadge: { position: "absolute", top: 0, right: 0, minWidth: spacing.md, height: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.peach },
  cartBadgeText: { ...typography.homeCaption, color: darkColors.dark },
  missingStore: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  sectionTitle: { ...typography.storeTitle, color: darkColors.white },
});
