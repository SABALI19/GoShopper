import { useUser } from "@clerk/expo";
import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "../ui/Icon";
import { useSupermarketStore } from "../../features/supermarket/store";
import { darkColors, radius, spacing, typography } from "../../theme";

export function StoreSelector() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata.role === "admin";
  const [visible, setVisible] = useState(false);
  const stores = useSupermarketStore((state) => state.stores);
  const selectedStoreId = useSupermarketStore((state) => state.selectedStoreId);
  const selectStore = useSupermarketStore((state) => state.selectStore);
  const selected = stores.find((store) => store.id === selectedStoreId);

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Select a store to manage" onPress={() => stores.length > 1 && setVisible(true)} style={[styles.selector, stores.length < 2 && styles.selectorStatic]}>
      {selected?.logoUrl ? <Image source={{ uri: selected.logoUrl }} style={styles.logo} /> : <View style={styles.logoFallback}><Icon color={darkColors.primary} name="store" size={spacing.md} /></View>}
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{isAdmin ? "Admin store access" : "Managing store"}</Text>
        <Text numberOfLines={1} style={styles.name}>{selected?.name ?? (stores.length ? "Choose a store" : "No stores found")}</Text>
      </View>
      {stores.length > 1 ? <Icon color={darkColors.white} name="chevron" size={spacing.md} /> : null}
    </Pressable>

    <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
      <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select a store</Text>
          <ScrollView style={styles.list}>
            {stores.map((store) => {
              const isSelected = store.id === selectedStoreId;
              return <Pressable key={store.id} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => { selectStore(store.id); setVisible(false); }} style={[styles.storeRow, isSelected && styles.selectedRow]}>
                <View style={styles.storeText}><Text style={styles.storeName}>{store.name}</Text><Text style={styles.status}>{store.isApproved ? (store.isActive ? "Approved · Active" : "Approved · Inactive") : "Awaiting approval"}</Text></View>
                {isSelected ? <Icon color={darkColors.primary} name="orders" size={spacing.md} /> : null}
              </Pressable>;
            })}
          </ScrollView>
          <Pressable onPress={() => setVisible(false)} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  selector: { minHeight: spacing.buttonHeight, marginBottom: spacing.md, padding: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  selectorStatic: { justifyContent: "flex-start" },
  logo: { width: spacing.xl, height: spacing.xl, borderRadius: radius.sm },
  logoFallback: { width: spacing.xl, height: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: darkColors.background },
  copy: { flex: 1 },
  eyebrow: { ...typography.storeCaption, color: darkColors.mutedText },
  name: { ...typography.storeBody, color: darkColors.white },
  backdrop: { flex: 1, justifyContent: "center", padding: spacing.md, backgroundColor: darkColors.overlay },
  sheet: { maxHeight: "75%", padding: spacing.md, borderRadius: radius.lg, backgroundColor: darkColors.background },
  sheetTitle: { ...typography.storeSection, marginBottom: spacing.sm, color: darkColors.white },
  list: { flexGrow: 0 },
  storeRow: { minHeight: spacing.xxl, marginBottom: spacing.xs, padding: spacing.sm, flexDirection: "row", alignItems: "center", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  selectedRow: { borderWidth: 1, borderColor: darkColors.primary },
  storeText: { flex: 1 },
  storeName: { ...typography.storeBody, color: darkColors.white },
  status: { ...typography.storeCaption, color: darkColors.mutedText },
  close: { minHeight: spacing.buttonHeight, marginTop: spacing.xs, alignItems: "center", justifyContent: "center" },
  closeText: { ...typography.button, color: darkColors.primary },
});
