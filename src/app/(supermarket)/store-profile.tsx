import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../features/auth/AuthProvider";
import { apiMessage, fetchManagedStore, fetchManagedStores, removeStoreBanner, removeStoreLogo, updateManagedStore, uploadStoreBanner, uploadStoreLogo } from "../../features/supermarket/api";
import { useSupermarketStore } from "../../features/supermarket/store";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { SectionCard, SkeletonCard, StatusChip } from "../../components/ui/WorkflowComponents";
import { darkColors, radius, spacing, typography } from "../../theme";

export default function SupermarketStoreProfileScreen() {
  const { getToken } = useAuth();
  const stores = useSupermarketStore(state => state.stores);
  const selectedStoreId = useSupermarketStore(state => state.selectedStoreId);
  const setStores = useSupermarketStore(state => state.setStores);
  const activeStoreId = selectedStoreId ?? stores[0]?.id ?? null;
  const [form, setForm] = useState<StoreProfileForm>({ name: "", category: "", tagline: "", description: "", line1: "", city: "", state: "", country: "Nigeria", openHours: "", isOpen: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [hasManagedLogo, setHasManagedLogo] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [hasManagedBanner, setHasManagedBanner] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerError, setBannerError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const token = await getToken(); if (!token) throw new Error("Your session expired. Sign in again.");
      let storeId = selectedStoreId;
      if (!stores.length) { const found = await fetchManagedStores(token); setStores(found); storeId = found[0]?.id ?? null; }
      if (!storeId) return;
      const store = await fetchManagedStore(token, storeId);
      setLogoUrl(store.logoUrl || ""); setHasManagedLogo(Boolean(store.hasManagedLogo));
      setBannerUrl(store.coverImageUrl || ""); setHasManagedBanner(Boolean(store.hasManagedBanner)); setBannerPreview("");
      setForm({ name: store.name || "", category: store.category || "", tagline: store.tagline || "", description: store.description || "", line1: store.address?.line1 || "", city: store.address?.city || "", state: store.address?.state || "", country: store.address?.country || "Nigeria", openHours: store.openHours || "", isOpen: store.isOpen });
    } catch (cause) { setLoadError(apiMessage(cause)); }
    finally { setLoading(false); }
  }, [getToken, selectedStoreId, setStores, stores.length]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const save = async () => {
    setError(""); setNotice("");
    const storeId = selectedStoreId ?? stores[0]?.id;
    if (!storeId) return setError("No store is selected for this account.");
    if (!form.name.trim() || !form.category.trim()) return setError("Store name and category are required.");
    setSaving(true);
    try {
      const token = await getToken(); if (!token) throw new Error("Your session expired. Sign in again.");
      await updateManagedStore(token, storeId, { name: form.name.trim(), category: form.category.trim(), tagline: form.tagline.trim(), description: form.description.trim(), openHours: form.openHours.trim(), isOpen: form.isOpen, address: { line1: form.line1.trim(), city: form.city.trim(), state: form.state.trim(), country: form.country.trim() } });
      setNotice("Store profile saved."); await load();
    } catch (cause) { setError(apiMessage(cause)); }
    finally { setSaving(false); }
  };

  const chooseLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError("Allow photo library access to choose your store logo."); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const side = Math.min(asset.width, asset.height);
    const context = ImageManipulator.manipulate(asset.uri);
    context.crop({ originX: Math.floor((asset.width - side) / 2), originY: Math.floor((asset.height - side) / 2), width: side, height: side }).resize({ width: 512, height: 512 });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    setLogoBusy(true); setError("");
    try { const token = await getToken(); if (!token || !activeStoreId) throw new Error("Your session or selected store could not be verified."); await uploadStoreLogo(token, activeStoreId, compressed.uri); await load(); setNotice("Store logo updated."); }
    catch (cause) { setError(apiMessage(cause)); }
    finally { setLogoBusy(false); }
  };

  const deleteLogo = async () => {
    setLogoBusy(true); setError("");
    try { const token = await getToken(); if (!token || !activeStoreId) throw new Error("Your session or selected store could not be verified."); await removeStoreLogo(token, activeStoreId); await load(); setNotice("Store logo removed."); }
    catch (cause) { setError(apiMessage(cause)); }
    finally { setLogoBusy(false); }
  };

  const chooseBanner = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError("Allow photo library access to choose your store banner."); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [5, 2], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const context = ImageManipulator.manipulate(asset.uri);
    context.resize({ width: 1600, height: 640 });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    setBannerPreview(compressed.uri); setBannerBusy(true); setBannerError(""); setError(""); setNotice("");
    try { const token = await getToken(); if (!token || !activeStoreId) throw new Error("Your session or selected store could not be verified."); await uploadStoreBanner(token, activeStoreId, compressed.uri); await load(); setNotice("Store banner updated."); }
    catch (cause) { setBannerError(apiMessage(cause)); }
    finally { setBannerBusy(false); }
  };

  const deleteBanner = async () => {
    setBannerBusy(true); setBannerError(""); setError(""); setNotice("");
    try { const token = await getToken(); if (!token || !activeStoreId) throw new Error("Your session or selected store could not be verified."); await removeStoreBanner(token, activeStoreId); await load(); setNotice("Store banner removed."); }
    catch (cause) { setBannerError(apiMessage(cause)); }
    finally { setBannerBusy(false); }
  };

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <RefreshableScrollView refreshAction={load} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Store profile</Text><Text style={styles.subtitle}>Keep your storefront information and opening hours up to date.</Text>
      {loading ? <><SkeletonCard /><SkeletonCard /></> : null}
      {!loading && !activeStoreId && !loadError ? <EmptyState icon="store" title="No approved store yet" description="Your store profile tools will be available once your application is approved." /> : null}
      {!loading && activeStoreId && !loadError ? <>
        <SectionCard title="Store logo">
          <View style={styles.logoRow}>{logoUrl ? <Image accessibilityLabel="Current store logo" source={{ uri: logoUrl }} style={styles.logo} /> : <View style={styles.logoPlaceholder}><Text style={styles.logoInitial}>{form.name.trim().charAt(0).toUpperCase() || "G"}</Text></View>}<View style={styles.logoActions}><Button title={logoBusy ? "Saving logo…" : logoUrl ? "Replace logo" : "Upload logo"} onPress={() => void chooseLogo()} loading={logoBusy} />{hasManagedLogo ? <Pressable accessibilityRole="button" disabled={logoBusy} onPress={() => void deleteLogo()}><Text style={styles.removeLogo}>Remove logo</Text></Pressable> : null}</View></View>
          {logoUrl && !hasManagedLogo ? <Text style={styles.hint}>This existing logo is externally hosted. Upload a new image to replace it.</Text> : null}
        </SectionCard>
        <SectionCard title="Store banner">
          {bannerPreview || bannerUrl ? <Image accessibilityLabel="Store banner preview" source={{ uri: bannerPreview || bannerUrl }} style={styles.banner} /> : <View style={styles.bannerPlaceholder}><Text style={styles.hint}>Your storefront banner preview will appear here.</Text></View>}
          <Button title={bannerBusy ? "Saving banner…" : bannerUrl ? "Replace banner" : "Upload banner"} onPress={() => void chooseBanner()} loading={bannerBusy} />
          {hasManagedBanner ? <Pressable accessibilityRole="button" disabled={bannerBusy} onPress={() => void deleteBanner()}><Text style={styles.removeLogo}>Remove banner</Text></Pressable> : null}
          {bannerUrl && !hasManagedBanner ? <Text style={styles.hint}>This existing banner is externally hosted. Upload a new image to replace it.</Text> : null}
          {bannerError ? <Text accessibilityRole="alert" style={styles.error}>{bannerError}</Text> : null}
        </SectionCard>
        <SectionCard title="Store details">
          {input("Store name", "name", form.name, setForm)}{input("Main category", "category", form.category, setForm)}{input("Tagline", "tagline", form.tagline, setForm)}{input("Description", "description", form.description, setForm, true)}
        </SectionCard>
        <SectionCard title="Store address">
          {input("Street address", "line1", form.line1, setForm)}{input("City / area", "city", form.city, setForm)}{input("State", "state", form.state, setForm)}{input("Country", "country", form.country, setForm)}
        </SectionCard>
        <SectionCard title="Opening hours">
          {input("Opening hours", "openHours", form.openHours, setForm, true)}
          <View style={styles.openRow}><View style={styles.openCopy}><Text style={styles.label}>Accepting orders</Text><Text style={styles.hint}>Closing stops new customer orders; it does not suspend your store.</Text></View><Switch value={form.isOpen} onValueChange={value => setForm(current => ({ ...current, isOpen: value }))} trackColor={{ false: darkColors.border, true: darkColors.primaryTint }} thumbColor={form.isOpen ? darkColors.primary : darkColors.mutedText} /></View>
          <StatusChip label={form.isOpen ? "Open for orders" : "Closed to orders"} tone={form.isOpen ? "success" : "neutral"} />
        </SectionCard>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{notice ? <Text accessibilityLiveRegion="polite" style={styles.success}>{notice}</Text> : null}
        <Button title="Save store profile" onPress={() => void save()} loading={saving} />
      </> : null}
      {!loading && loadError ? <SectionCard><Text style={styles.error}>{loadError}</Text><Button title="Retry loading" onPress={() => void load()} /></SectionCard> : null}
    </RefreshableScrollView>
  </SafeAreaView>;
}

type StoreProfileForm = { name: string; category: string; tagline: string; description: string; line1: string; city: string; state: string; country: string; openHours: string; isOpen: boolean };
type FormKey = Exclude<keyof StoreProfileForm, "isOpen">;
function input<K extends FormKey>(label: string, key: K, value: string, setForm: Dispatch<SetStateAction<StoreProfileForm>>, multiline = false) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={text => setForm(current => ({ ...current, [key]: text }))} multiline={multiline} placeholderTextColor={darkColors.placeholder} style={[styles.input, multiline && styles.multiline]} /></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background }, page: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }, title: { ...typography.orderTitle, color: darkColors.white }, subtitle: { ...typography.storeCaption, color: darkColors.mutedText },
  field: { gap: spacing.xxs }, label: { ...typography.storeCaption, color: darkColors.mutedText }, input: { minHeight: spacing.homeSearchHeight, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface, color: darkColors.white, ...typography.input }, multiline: { minHeight: spacing.metricCardHeight, paddingTop: spacing.sm, textAlignVertical: "top" },
  openRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }, openCopy: { flex: 1, gap: spacing.xxs }, hint: { ...typography.storeCaption, color: darkColors.mutedText }, error: { ...typography.storeCaption, color: darkColors.error }, success: { ...typography.storeCaption, color: darkColors.success },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md }, logo: { width: spacing.profileIconSize * 2, height: spacing.profileIconSize * 2, borderRadius: radius.md, backgroundColor: darkColors.inputSurface }, logoPlaceholder: { width: spacing.profileIconSize * 2, height: spacing.profileIconSize * 2, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: darkColors.primaryTint }, logoInitial: { ...typography.orderTitle, color: darkColors.primary }, logoActions: { flex: 1, gap: spacing.xs }, removeLogo: { ...typography.storeCaption, padding: spacing.xs, color: darkColors.primary, textAlign: "center" }, banner: { width: "100%", aspectRatio: 2.5, borderRadius: radius.card, backgroundColor: darkColors.inputSurface }, bannerPlaceholder: { width: "100%", aspectRatio: 2.5, alignItems: "center", justifyContent: "center", padding: spacing.md, borderRadius: radius.card, backgroundColor: darkColors.inputSurface },
});
