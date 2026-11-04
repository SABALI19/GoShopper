import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";
import { stores } from "../../../features/stores/data";
import { fetchStores } from "../../../features/stores/api";
import type { StoreInfo } from "../../../features/stores/data";

const popularStores = [
  { storeId: "fashion-hub", name: "Fashion Hub", image: require("../../../../assets/images/explore/store-fashion.png") },
  { storeId: "wine-store", name: "Wine Store", image: require("../../../../assets/images/explore/store-wine.png") },
  { storeId: "food-mart", name: "Food Mart", image: require("../../../../assets/images/explore/store-food-mart.png") },
];

const trendingProducts = [
  { name: "Short Sleeve", image: require("../../../../assets/images/explore/product-shirt.png"), storeId: "style-hub" },
  { name: "Fruits Tray", image: require("../../../../assets/images/explore/product-fruit.png"), storeId: "bokku-mart", search: "Fruits Tray" },
  { name: "Running Shoes", image: require("../../../../assets/images/explore/product-shoes.png"), storeId: "jumia" },
];

const exploreCategories = [
  { name: "Fashion", image: require("../../../../assets/images/explore/category-fashion.png"), storeId: "style-hub" },
  { name: "Appliances", image: require("../../../../assets/images/explore/category-appliances.png"), storeId: "home-comforts" },
  { name: "Food and Drinks", image: require("../../../../assets/images/explore/category-food-drinks.png"), storeId: "bokku-mart" },
  { name: "Electronics", image: require("../../../../assets/images/explore/category-electronics.png"), storeId: "jumia" },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [remoteStores, setRemoteStores] = useState<StoreInfo[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchStores().then((result) => {
      if (active && result?.length) setRemoteStores(result);
    }).catch((error) => {
      if (__DEV__) console.warn("Could not load stores from Go-Shopper API", error);
    });
    return () => { active = false; };
  }, []);

  const visibleStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = remoteStores?.map((store) => ({
      storeId: store.id,
      name: store.name,
      image: store.logo,
      category: store.category,
    })) ?? popularStores.map((store) => ({
      ...store,
      category: stores.find((item) => item.id === store.storeId)?.category || "",
    }));
    return source.filter((store) => {
      const matchesText = store.name.toLowerCase().includes(normalizedQuery);
      const matchesFilter = selectedFilter === "All" || store.category === selectedFilter;
      return matchesText && matchesFilter;
    });
  }, [query, remoteStores, selectedFilter]);

  const visibleProducts = trendingProducts.filter((product) =>
    product.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const categoryWidth = (width - spacing.explorePageInset * 2 - spacing.exploreCategoryColumnGap) / 2;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon color={darkColors.mutedText} name="search" size={spacing.exploreSearchIconSize} />
            <TextInput
              accessibilityLabel="Search stores or items"
              onChangeText={setQuery}
              placeholder="Search stores or items"
              placeholderTextColor={darkColors.mutedText}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            <Pressable accessibilityLabel="Voice search" accessibilityRole="button" style={styles.micButton}>
              <Icon color={darkColors.mutedText} name="mic" size={spacing.md} />
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel="Show filters"
            accessibilityRole="button"
            onPress={() => setFiltersVisible((visible) => !visible)}
            style={styles.filterButton}
          >
            <Icon color={darkColors.white} name="filter" size={spacing.lg} />
          </Pressable>
        </View>

        {filtersVisible ? (
          <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
            {["All", "Food", "Fashion", "Electronics", "Home"].map((filter) => (
              <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}>
                <Text style={styles.filterText}>{filter}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.pageTitle}>Trending Now</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Stores</Text>
          <ScrollView contentContainerStyle={styles.horizontalCards} horizontal showsHorizontalScrollIndicator={false}>
            {visibleStores.map((store) => (
              <Pressable
                accessibilityLabel={`Open ${store.name}`}
                accessibilityRole="button"
                key={store.storeId}
                onPress={() => router.push({ pathname: "/(customer)/store/[storeId]", params: { storeId: store.storeId } })}
                style={styles.storeCard}
              >
                <Image source={store.image} style={styles.storeImage} />
                <Text numberOfLines={1} style={styles.cardLabel}>{store.name}</Text>
              </Pressable>
            ))}
            {visibleStores.length === 0 ? <Text style={styles.noResults}>No stores match your search.</Text> : null}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Products</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(customer)/products")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.horizontalCards} horizontal showsHorizontalScrollIndicator={false}>
            {visibleProducts.map((product) => (
              <Pressable
                accessibilityRole="button"
                key={product.name}
                onPress={() => product.search
                  ? router.push({ pathname: "/(customer)/products", params: { search: product.search } })
                  : router.push({ pathname: "/(customer)/store/[storeId]", params: { storeId: product.storeId } })}
                style={styles.productCard}
              >
                <Image source={product.image} style={styles.productImage} />
                <Text numberOfLines={1} style={styles.cardLabel}>{product.name}</Text>
              </Pressable>
            ))}
            {visibleProducts.length === 0 ? <Text style={styles.noResults}>No products match your search.</Text> : null}
          </ScrollView>
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Explore Categories</Text>
          <View style={styles.categoryGrid}>
            {exploreCategories.map((category) => (
              <Pressable
                accessibilityLabel={`Browse ${category.name}`}
                accessibilityRole="button"
                key={category.name}
                onPress={() => router.push({ pathname: "/(customer)/store/[storeId]", params: { storeId: category.storeId } })}
                style={[styles.categoryCard, { width: categoryWidth }]}
              >
                <Image source={category.image} style={styles.categoryImage} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.explorePageInset, paddingTop: spacing.md, paddingBottom: spacing.xl },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.exploreSearchGap },
  searchBox: { flex: 1, height: spacing.exploreSearchHeight, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.search, backgroundColor: darkColors.inputSurface },
  searchInput: { flex: 1, ...typography.input, color: darkColors.white, paddingVertical: 0 },
  micButton: { padding: spacing.xxs },
  filterButton: { width: spacing.exploreFilterSize, height: spacing.exploreFilterSize, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: darkColors.primary },
  filters: { gap: spacing.xs, paddingTop: spacing.sm },
  filterPill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.round, backgroundColor: darkColors.inputSurface },
  filterPillActive: { backgroundColor: darkColors.primary },
  filterText: { ...typography.homeCaption, color: darkColors.white },
  pageTitle: { ...typography.exploreTitle, marginTop: spacing.exploreTitleTop, color: darkColors.white },
  section: { marginTop: spacing.exploreSectionGap },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { ...typography.exploreSection, color: darkColors.white },
  seeAll: { ...typography.homeCaption, color: darkColors.primary },
  horizontalCards: { gap: spacing.sm, paddingTop: spacing.exploreSectionTitleBottom },
  storeCard: { width: spacing.exploreStoreCardWidth },
  storeImage: { width: "100%", height: spacing.exploreStoreImageHeight, borderRadius: radius.md },
  productCard: { width: spacing.exploreProductCardWidth },
  productImage: { width: "100%", height: spacing.exploreProductImageHeight, borderRadius: radius.md },
  cardLabel: { ...typography.exploreCaption, marginTop: spacing.exploreStoreLabelTop, color: darkColors.white },
  categorySection: { marginTop: spacing.exploreSectionGap },
  categoryGrid: { marginTop: spacing.exploreSectionTitleBottom, flexDirection: "row", flexWrap: "wrap", columnGap: spacing.exploreCategoryColumnGap, rowGap: spacing.exploreCategoryRowGap },
  categoryCard: { height: spacing.exploreCategoryHeight, overflow: "hidden", borderRadius: radius.md },
  categoryImage: { width: "100%", height: "100%" },
  noResults: { ...typography.homeCaption, paddingVertical: spacing.sm, color: darkColors.mutedText },
});
