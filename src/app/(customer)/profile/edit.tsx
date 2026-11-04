import { useRouter } from "expo-router";
import { useUser } from "@clerk/expo";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { Icon } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [busy, setBusy] = useState(false);
  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      router.back();
    } catch {
      Alert.alert("Couldn’t update profile", "Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TextField autoCapitalize="words" label="First Name" onChangeText={setFirstName} placeholder="Enter your first name" value={firstName} />
        <TextField autoCapitalize="words" label="Last Name" onChangeText={setLastName} placeholder="Enter your last name" value={lastName} />
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Email</Text>
          <Text style={styles.readOnlyValue}>{user?.primaryEmailAddress?.emailAddress ?? "No email address"}</Text>
        </View>
        <Button loading={busy} onPress={saveProfile} title="Save Changes" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  header: { paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  backButton: { width: spacing.lg + spacing.xs, height: spacing.lg + spacing.xs, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  title: { ...typography.storeTitle, color: darkColors.white },
  form: { padding: spacing.md, gap: spacing.md },
  readOnlyField: { gap: spacing.xs },
  readOnlyLabel: { ...typography.fieldLabel, color: darkColors.white },
  readOnlyValue: { ...typography.input, minHeight: spacing.loginFieldHeight, padding: spacing.md, overflow: "hidden", borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface, color: darkColors.mutedText },
});
