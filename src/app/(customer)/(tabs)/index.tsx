import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
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
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";
import { useRouter } from "expo-router";
import { stores } from "../../../features/stores/data";

type Category = {
  name: string;
  icon?: IconName;
};

const categories: Category[] = [
  { name: "All" },
  { name: "Food", icon: "food" },
  { name: "Fashion", icon: "fashion" },
  { name: "Electronics", icon: "phone" },
];

const offers = [
  {
    store: "Gadget World",
    detail: "50% Off All Headphones",
    image: require("../../../../assets/images/home/deal-headphones.png"),
  },
  {
    store: "The Tasteful Fruits",
    detail: "Free Delivery",
    image: require("../../../../assets/images/home/deal-fruit.png"),
  },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const visibleStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return stores.filter((store) => {
      if (store.showOnHome === false) return false;
      const matchesCategory =
        selectedCategory === "All" || store.category === selectedCategory;
      const matchesQuery = store.name.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  if (!fontsLoaded) return null;

  const storeWidth =
    (width - spacing.homePageInset * 2 - spacing.homeGridGap) / 2;
  const offerWidth = width * (spacing.homeOfferWidthPercent / 100);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>Go-Shopper</Text>
          <Pressable accessibilityLabel="Notifications" accessibilityRole="button">
            <Icon color={darkColors.white} name="bell" size={spacing.lg} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Icon color={darkColors.mutedText} name="search" size={spacing.md} />
          <TextInput
            accessibilityLabel="Search stores or items"
            onChangeText={setQuery}
            placeholder="Search stores or items"
            placeholderTextColor={darkColors.mutedText}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.categoryList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {categories.map((category) => {
            const active = selectedCategory === category.name;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={category.name}
                onPress={() => setSelectedCategory(category.name)}
                style={[styles.categoryPill, active && styles.categoryPillActive]}
              >
                {category.icon ? (
                  <Icon
                    color={darkColors.white}
                    name={category.icon}
                    size={spacing.md}
                  />
                ) : null}
                <Text style={styles.categoryText}>{category.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.offerList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {offers.map((offer) => (
            <Pressable
              accessibilityRole="button"
              key={offer.store}
              style={[styles.offerCard, { width: offerWidth }]}
            >
              <Image source={offer.image} style={styles.offerImage} />
              <View style={styles.offerFooter}>
                <Text numberOfLines={1} style={styles.offerStore}>
                  {offer.store}
                </Text>
                <Text numberOfLines={1} style={styles.offerDetail}>
                  {offer.detail}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.storesHeading}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === "All" ? "All Stores" : `${selectedCategory} Stores`}
          </Text>
        </View>

        {visibleStores.length > 0 ? (
          <View style={styles.storeGrid}>
            {visibleStores.map((store) => (
              <StoreCard key={store.id} store={store} width={storeWidth} onPress={() => router.push({ pathname: "/(customer)/store/[storeId]", params: { storeId: store.id } })} />
            ))}
          </View>
        ) : (
          <View style={styles.noResults}>
            <Text style={styles.noResultsTitle}>No stores found</Text>
            <Text style={styles.noResultsText}>Try another name or category.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StoreCard({ store, width, onPress }: { store: (typeof stores)[number]; width: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.storeCard, { width }]}>
      <Image
        resizeMode="cover"
        source={store.logo}
        style={styles.storeImage}
      />
      <Text numberOfLines={1} style={styles.storeName}>
        {store.name}
      </Text>
      <View style={styles.ratingRow}>
        <Icon color={darkColors.warning} name="star" size={spacing.md} />
        <Text style={styles.ratingText}>{store.rating ?? "—"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  pageContent: {
    paddingHorizontal: spacing.homePageInset,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  header: {
    minHeight: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    ...typography.homeBrand,
    color: darkColors.primary,
  },
  searchBox: {
    height: spacing.homeSearchHeight,
    marginTop: spacing.homeSearchTop,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.search,
    backgroundColor: darkColors.inputSurface,
  },
  searchInput: {
    flex: 1,
    ...typography.input,
    color: darkColors.white,
    paddingVertical: 0,
  },
  categoryList: {
    gap: spacing.xs,
    paddingVertical: spacing.homeCategoryTop,
  },
  categoryPill: {
    minHeight: spacing.xl,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.round,
    backgroundColor: darkColors.inputSurface,
  },
  categoryPillActive: {
    backgroundColor: darkColors.primary,
  },
  categoryText: {
    ...typography.homeBody,
    color: darkColors.white,
  },
  offerList: {
    gap: spacing.homeCardGap,
  },
  offerCard: {
    overflow: "hidden",
    borderRadius: radius.card,
    backgroundColor: darkColors.cardFooter,
  },
  offerImage: {
    width: "100%",
    height: spacing.homeOfferImageHeight,
  },
  offerFooter: {
    height: spacing.homeOfferFooterHeight,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
    backgroundColor: darkColors.cardFooter,
  },
  offerStore: {
    ...typography.homeCaption,
    fontFamily: "Poppins_700Bold",
    color: darkColors.dark,
  },
  offerDetail: {
    ...typography.homeCaption,
    color: darkColors.dark,
  },
  storesHeading: {
    marginTop: spacing.homeStoreSectionTop,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.homeSection,
    color: darkColors.white,
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.homeGridGap,
    rowGap: spacing.homeGridRowGap,
  },
  storeCard: {
    overflow: "hidden",
  },
  storeImage: {
    width: "100%",
    aspectRatio: spacing.homeStoreImageAspectRatio,
    borderRadius: radius.card,
  },
  storeName: {
    ...typography.homeBody,
    marginTop: spacing.xs,
    color: darkColors.white,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.homeRatingGap,
  },
  ratingText: {
    ...typography.homeCaption,
    color: darkColors.mutedText,
  },
  noResults: {
    minHeight: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsTitle: {
    ...typography.homeSection,
    color: darkColors.white,
  },
  noResultsText: {
    ...typography.homeCaption,
    color: darkColors.mutedText,
  },
});
