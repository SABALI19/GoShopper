import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "../../components/ui/Button";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { TextField } from "../../components/ui/TextField";
import { GoShopperBag } from "../../components/GoShopperBag";
import { darkColors, lightColors, spacing, typography } from "../../theme";

export default function SignUpScreen() {
  const auth = useAuth();
  const { width, height } = useWindowDimensions();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const register = async () => {
    if (password !== confirm) { setError("Passwords don’t match."); return; }
    setBusy(true);
    setError("");
    try {
      const [firstName, ...last] = fullName.trim().split(/\s+/);
      await auth.register({ role: "customer", firstName, lastName: last.join(" "), email, phone, password });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.screen}>
    <StatusBar style="light" />
    <View style={s.content}>
      <Svg width={width} height={height} viewBox="0 0 393 852" preserveAspectRatio="none" style={s.shape}><Path d="M0 0H393V202L0 344V0Z" fill={lightColors.primary} /></Svg>
      <View style={[s.logo, { top: `${spacing.signupLogoTopPercent}%` }]}><GoShopperBag size={100} /></View>
      <Text style={[s.title, { top: `${spacing.signupTitleTopPercent}%` }]}>Create your Account</Text>
      <View style={[s.form, { top: `${spacing.signupFormTopPercent}%`, bottom: `${spacing.signupFormBottomPercent}%` }]}>
        <RefreshableScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} contentContainerStyle={s.fields} showsVerticalScrollIndicator={false}>
          <TextField autoCapitalize="words" label="Full Name" onChangeText={setFullName} placeholder="Enter your Full Name" value={fullName} />
          <TextField autoCapitalize="none" keyboardType="email-address" label="Email Address" onChangeText={setEmail} placeholder="Enter your email address" value={email} />
          <TextField keyboardType="phone-pad" label="Phone Number" onChangeText={setPhone} placeholder="Enter your phone number" value={phone} />
          <TextField label="Password" onChangeText={setPassword} placeholder="Enter your password" secureTextEntry value={password} />
          <TextField label="Confirm Password" onChangeText={setConfirm} placeholder="Enter your Confirm password" secureTextEntry value={confirm} />
          <View style={{ marginTop: spacing.signupButtonTop }}><Button disabled={!fullName.trim() || !email.trim() || !phone.trim() || !password || !confirm} loading={busy} onPress={() => void register()} title="Sign Up" /></View>
          {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        </RefreshableScrollView>
      </View>
      <View style={s.footer}><Text style={s.footerText}>Already have an account? </Text><Pressable onPress={() => router.replace("/(auth)/login")}><Text style={s.link}>Sign in</Text></Pressable></View>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: darkColors.dark }, content: { flex: 1 }, shape: { position: "absolute", top: 0, left: 0 }, logo: { position: "absolute", alignSelf: "center" }, title: { position: "absolute", left: spacing.md, right: spacing.md, ...typography.authTitle, color: darkColors.white, textAlign: "center" }, form: { position: "absolute", left: spacing.loginLabelInset, right: spacing.loginLabelInset }, fields: { paddingBottom: spacing.md, gap: spacing.loginFieldGap }, error: { ...typography.input, color: darkColors.error }, link: { ...typography.authLink, color: darkColors.primary }, footer: { position: "absolute", left: spacing.md, right: spacing.md, bottom: `${spacing.signupFooterBottomPercent}%`, flexDirection: "row", justifyContent: "center", alignItems: "center" }, footerText: { ...typography.authLink, color: darkColors.white } });
