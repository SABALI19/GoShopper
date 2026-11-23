import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useSupermarketStore } from "../../../features/supermarket/store";
import { apiMessage, createProduct, fetchProducts, fetchManagedStores, updateProduct, uploadProductImage, type ManagedProduct } from "../../../features/supermarket/api";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { BottomSheet, ListCard, SectionCard, SkeletonCard, StatTile, StatusChip } from "../../../components/ui/WorkflowComponents";
import { darkColors, radius, spacing, typography } from "../../../theme";

type Draft = { name: string; description: string; category: string; price: string; stock: string; unitType: "unit" | "weight"; unitLabel: string; barcode: string; isAvailable: boolean };
const blankDraft: Draft = { name: "", description: "", category: "", price: "", stock: "", unitType: "unit", unitLabel: "each", barcode: "", isAvailable: true };

export default function SupermarketProductsScreen() {
  const { getToken } = useAuth();
  const stores = useSupermarketStore(state => state.stores);
  const selectedStoreId = useSupermarketStore(state => state.selectedStoreId);
  const setStores = useSupermarketStore(state => state.setStores);
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [editing, setEditing] = useState<ManagedProduct | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [imageUri, setImageUri] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      let storeId = selectedStoreId;
      if (!stores.length) { const found = await fetchManagedStores(token); setStores(found); storeId = found[0]?.id ?? null; }
      if (!storeId) { setProducts([]); setTotal(0); return; }
      const result = await fetchProducts(token, storeId, { page, q: search.trim() || undefined, category: category || undefined, availability, lowStock: lowStockOnly });
      setProducts(result.products); setCategories(result.categories); setTotal(result.total); setLowStockCount(result.lowStockCount);
    } catch (cause) { setError(apiMessage(cause)); }
    finally { setLoading(false); }
  }, [availability, category, getToken, lowStockOnly, page, search, selectedStoreId, setStores, stores]);

  useEffect(() => { const timer = setTimeout(() => void load(), search ? 250 : 0); return () => clearTimeout(timer); }, [load, search]);
  const openNew = () => { setEditing(null); setDraft(blankDraft); setImageUri(""); setDraftError(""); setSheetOpen(true); };
  const openEdit = (product: ManagedProduct) => { setEditing(product); setDraft({ name: product.name, description: product.description || "", category: product.category, price: String((product.priceKobo / 100).toFixed(2)), stock: String(product.stockQuantity), unitType: product.unitType || "unit", unitLabel: product.unitLabel || "each", barcode: product.barcode || "", isAvailable: product.isAvailable }); setImageUri(""); setDraftError(""); setSheetOpen(true); };

  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setDraftError("Allow photo library access to select a product image."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const context = ImageManipulator.manipulate(result.assets[0].uri);
    context.resize({ width: 1200, height: null });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    setImageUri(compressed.uri); setDraftError("");
  };

  const save = async () => {
    setDraftError("");
    const price = Number(draft.price);
    const stock = Number(draft.stock);
    if (!draft.name.trim() || !draft.category.trim()) return setDraftError("Product name and category are required.");
    if (!/^\d+(\.\d{1,2})?$/.test(draft.price) || !Number.isSafeInteger(Math.round(price * 100))) return setDraftError("Enter a valid price in naira, up to two decimal places.");
    if (!/^\d+$/.test(draft.stock) || !Number.isSafeInteger(stock)) return setDraftError("Stock must be a whole number zero or higher.");
    if (!selectedStoreId) return setDraftError("Select an approved store before editing products.");
    setSaving(true);
    try {
      const token = await getToken(); if (!token) throw new Error("Your session expired. Sign in again.");
      const data = { name: draft.name.trim(), description: draft.description.trim(), category: draft.category.trim(), priceKobo: Math.round(price * 100), stockQuantity: stock, unitType: draft.unitType, unitLabel: draft.unitLabel.trim() || (draft.unitType === "weight" ? "kg" : "each"), barcode: draft.barcode.trim(), isAvailable: draft.isAvailable };
      const result = editing ? await updateProduct(token, selectedStoreId, editing.id, data) : await createProduct(token, selectedStoreId, data);
      if (imageUri) await uploadProductImage(token, selectedStoreId, result.product.productKey || result.product.id, imageUri);
      setSheetOpen(false); await load();
    } catch (cause) { setDraftError(apiMessage(cause)); }
    finally { setSaving(false); }
  };

  const toggleAvailability = async (product: ManagedProduct, value: boolean) => {
    if (!selectedStoreId) return;
    try { const token = await getToken(); if (!token) throw new Error("Your session expired. Sign in again."); await updateProduct(token, selectedStoreId, product.id, { isAvailable: value }); await load(); }
    catch (cause) { setError(apiMessage(cause)); }
  };

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <RefreshableScrollView refreshAction={load} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.heading}><View><Text style={styles.title}>Products</Text><Text style={styles.copy}>Manage your catalogue and stock.</Text></View><Pressable accessibilityRole="button" onPress={openNew} style={styles.addButton}><Text style={styles.addText}>+ Add</Text></Pressable></View>
      <View style={styles.stats}><StatTile label="Products" value={total} /><StatTile label="Low stock" value={lowStockCount} hint="5 or fewer" /></View>
      <TextInput accessibilityLabel="Search products" placeholder="Search name, barcode or product key" placeholderTextColor={darkColors.placeholder} value={search} onChangeText={value => { setPage(1); setSearch(value); }} style={styles.input} />
      <View style={styles.filters}>
        {[{ label: "All", value: "all" }, { label: "Available", value: "available" }, { label: "Unavailable", value: "unavailable" }].map(option => <Pressable key={option.value} onPress={() => { setPage(1); setAvailability(option.value); }}><StatusChip label={option.label} tone={availability === option.value ? "success" : "neutral"} /></Pressable>)}
        <Pressable onPress={() => { setPage(1); setLowStockOnly(value => !value); }}><StatusChip label={lowStockOnly ? "Low stock only" : "Low stock"} tone={lowStockOnly ? "warning" : "neutral"} /></Pressable>
      </View>
      {categories.length ? <View style={styles.filters}>{["", ...categories].map(value => <Pressable key={value || "all-categories"} onPress={() => { setPage(1); setCategory(value); }}><StatusChip label={value || "All categories"} tone={category === value ? "success" : "neutral"} /></Pressable>)}</View> : null}
      {loading && !products.length ? <><SkeletonCard /><SkeletonCard /></> : null}
      {error ? <SectionCard><Text style={styles.error}>{error}</Text><Button title="Retry" onPress={() => void load()} /></SectionCard> : null}
      {!loading && !error && !products.length ? <EmptyState icon="store" title="No products found" description={search || category || lowStockOnly ? "Try changing your search or filters." : "Add your first product to start building your catalogue."} /> : null}
      {products.map(product => <ListCard key={product.id} right={<View style={styles.productActions}><Text style={styles.price}>{formatNaira(product.priceKobo)}</Text><Pressable accessibilityRole="button" onPress={() => openEdit(product)}><Text style={styles.editAction}>Edit</Text></Pressable></View>}>
        {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : null}
        <Text numberOfLines={1} style={styles.productName}>{product.name}</Text><Text numberOfLines={1} style={styles.meta}>{product.category} · {product.stockQuantity} {product.unitLabel || "in stock"}</Text>
        {product.stockQuantity <= 5 ? <StatusChip label="Low stock" tone="warning" /> : <StatusChip label={product.isAvailable ? "Available" : "Unavailable"} tone={product.isAvailable ? "success" : "neutral"} />}
        <View style={styles.toggle}><Text style={styles.meta}>Available</Text><Switch value={product.isAvailable} onValueChange={value => void toggleAvailability(product, value)} trackColor={{ false: darkColors.border, true: darkColors.primaryTint }} thumbColor={product.isAvailable ? darkColors.primary : darkColors.mutedText} /></View>
      </ListCard>)}
      {!loading && total > 0 ? <View style={styles.pagination}><Text style={styles.meta}>Page {page} · {total} products</Text><View style={styles.pagerButtons}><Pressable disabled={page <= 1} onPress={() => setPage(value => Math.max(1, value - 1))} style={[styles.pageButton, page <= 1 && styles.disabled]}><Text style={styles.pageButtonText}>Previous</Text></Pressable><Pressable disabled={page * 20 >= total} onPress={() => setPage(value => value + 1)} style={[styles.pageButton, page * 20 >= total && styles.disabled]}><Text style={styles.pageButtonText}>Next</Text></Pressable></View></View> : null}
    </RefreshableScrollView>
    <BottomSheet visible={sheetOpen} title={editing ? "Edit product" : "Add product"} onClose={() => setSheetOpen(false)} style={styles.bottomSheet}>
      <RefreshableScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetFields} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {imageUri || editing?.imageUrl ? <Image source={{ uri: imageUri || editing?.imageUrl }} style={styles.preview} /> : null}
        <Button title={imageUri ? "Change image" : "Add product image"} onPress={() => void chooseImage()} />
        {field("Product name", draft.name, value => setDraft({ ...draft, name: value }))}
        {field("Category", draft.category, value => setDraft({ ...draft, category: value }))}
        {field("Price (₦)", draft.price, value => setDraft({ ...draft, price: value }), "decimal-pad")}
        {field("Stock quantity", draft.stock, value => setDraft({ ...draft, stock: value }), "number-pad")}
        <View style={styles.filters}><Pressable onPress={() => setDraft({ ...draft, unitType: "unit", unitLabel: "each" })}><StatusChip label="By unit" tone={draft.unitType === "unit" ? "success" : "neutral"} /></Pressable><Pressable onPress={() => setDraft({ ...draft, unitType: "weight", unitLabel: "kg" })}><StatusChip label="By weight" tone={draft.unitType === "weight" ? "success" : "neutral"} /></Pressable></View>
        {field("Unit label (each, kg, litre...)", draft.unitLabel, value => setDraft({ ...draft, unitLabel: value }))}
        {field("Barcode (optional)", draft.barcode, value => setDraft({ ...draft, barcode: value }))}
        {field("Description (optional)", draft.description, value => setDraft({ ...draft, description: value }), "default", true)}
        <View style={styles.availability}><Text style={styles.meta}>Available for sale</Text><Switch value={draft.isAvailable} onValueChange={value => setDraft({ ...draft, isAvailable: value })} /></View>
        {draftError ? <Text accessibilityRole="alert" style={styles.error}>{draftError}</Text> : null}
        <Button title={editing ? "Save changes" : "Create product"} onPress={() => void save()} loading={saving} />
      </RefreshableScrollView>
    </BottomSheet>
  </SafeAreaView>;
}

function field(label: string, value: string, onChangeText: (value: string) => void, keyboardType: "default" | "decimal-pad" | "number-pad" = "default", multiline = false) {
  return <View style={styles.field}><Text style={styles.meta}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={keyboardType} multiline={multiline} placeholderTextColor={darkColors.placeholder} style={[styles.input, multiline && styles.multiline]} /></View>;
}
function formatNaira(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background }, page: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }, title: { ...typography.orderTitle, color: darkColors.white }, copy: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  addButton: { minHeight: spacing.xl, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.button, backgroundColor: darkColors.primary }, addText: { ...typography.button, color: darkColors.white },
  stats: { flexDirection: "row", gap: spacing.sm }, input: { minHeight: spacing.homeSearchHeight, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface, color: darkColors.white, ...typography.input },
  filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs },
  pagination: { gap: spacing.xs, alignItems: "center" }, pagerButtons: { flexDirection: "row", gap: spacing.xs }, pageButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.button, backgroundColor: darkColors.storeSurface }, pageButtonText: { ...typography.storeCaption, color: darkColors.white }, disabled: { opacity: 0.45 },
  productImage: { width: spacing.xxl, height: spacing.xxl, borderRadius: radius.md }, productName: { ...typography.storeBody, color: darkColors.white }, meta: { ...typography.storeCaption, color: darkColors.mutedText }, price: { ...typography.storeBody, color: darkColors.white }, productActions: { alignItems: "flex-end", gap: spacing.xs }, editAction: { ...typography.storeCaption, color: darkColors.primary }, toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  error: { ...typography.storeCaption, color: darkColors.error }, bottomSheet: { maxHeight: "85%" }, sheetScroll: { flexShrink: 1 }, sheetFields: { gap: spacing.sm, paddingBottom: spacing.xl }, field: { gap: spacing.xxs }, multiline: { minHeight: spacing.recoverySuccessCardHeight / 3, textAlignVertical: "top", paddingTop: spacing.sm }, preview: { width: "100%", height: spacing.recoverySuccessCardHeight / 2, borderRadius: radius.card, backgroundColor: darkColors.storeSurface }, availability: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
});
