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
  const [emailPending, setEmailPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const register = async () => {
    if (password !== confirm) { setError("Passwords don’t match."); return; }
    setBusy(true);
    setError("");
    try {
      const [firstName, ...last] = fullName.trim().split(/\s+/);
      const result = await auth.register({ role: "customer", firstName, lastName: last.join(" "), email, phone, password });
      setEmailPending(true);
      setNotice(result.verification.emailSent
        ? `A verification link was sent to ${email}. Open it to verify your account, then sign in.`
        : "Your account was created, but the verification email could not be sent. Configure Brevo SMTP, then request another email below.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      await auth.resendVerification(email);
      setNotice("If the account exists and still needs email verification, a fresh link will be sent. Check your inbox and spam folder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend the verification email.");
    } finally {
      setBusy(false);
    }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.screen}>
    <StatusBar style="light" />
    <View style={s.content}>
      <Svg width={width} height={height} viewBox="0 0 393 852" preserveAspectRatio="none" style={s.shape}><Path d="M0 0H393V202L0 344V0Z" fill={lightColors.primary} /></Svg>
      <View style={[s.logo, { top: `${spacing.signupLogoTopPercent}%` }]}><GoShopperBag size={100} /></View>
      <Text style={[s.title, { top: `${spacing.signupTitleTopPercent}%` }]}>{emailPending ? "Verify your email" : "Create your Account"}</Text>
      <View style={[s.form, { top: `${spacing.signupFormTopPercent}%`, bottom: `${spacing.signupFormBottomPercent}%` }]}>
        <RefreshableScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} contentContainerStyle={s.fields} showsVerticalScrollIndicator={false}>
          {emailPending ? <>
            <Text style={s.hint}>{notice}</Text>
            <Text style={s.hint}>Open the verification link from your email. After verifying, sign in with your email and password.</Text>
            <Button disabled={busy} loading={busy} onPress={() => void resend()} title="Resend verification email" />
          </> : <>
            <TextField autoCapitalize="words" label="Full Name" onChangeText={setFullName} placeholder="Enter your Full Name" value={fullName} />
            <TextField autoCapitalize="none" keyboardType="email-address" label="Email Address" onChangeText={setEmail} placeholder="Enter your email address" value={email} />
            <TextField keyboardType="phone-pad" label="Phone Number" onChangeText={setPhone} placeholder="Enter your phone number" value={phone} />
            <TextField label="Password" onChangeText={setPassword} placeholder="Enter your password" secureTextEntry value={password} />
            <TextField label="Confirm Password" onChangeText={setConfirm} placeholder="Enter your Confirm password" secureTextEntry value={confirm} />
            <View style={{ marginTop: spacing.signupButtonTop }}><Button disabled={!fullName.trim() || !email.trim() || !phone.trim() || !password || !confirm} loading={busy} onPress={() => void register()} title="Sign Up" /></View>
          </>}
          {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        </RefreshableScrollView>
      </View>
      <View style={s.footer}><Text style={s.footerText}>Already have an account? </Text><Pressable onPress={() => router.replace("/(auth)/login")}><Text style={s.link}>Sign in</Text></Pressable></View>
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: darkColors.dark }, content: { flex: 1 }, shape: { position: "absolute", top: 0, left: 0 }, logo: { position: "absolute", alignSelf: "center" }, title: { position: "absolute", left: spacing.md, right: spacing.md, ...typography.authTitle, color: darkColors.white, textAlign: "center" }, form: { position: "absolute", left: spacing.loginLabelInset, right: spacing.loginLabelInset }, fields: { paddingBottom: spacing.md, gap: spacing.loginFieldGap }, hint: { ...typography.input, color: darkColors.white }, error: { ...typography.input, color: darkColors.error }, link: { ...typography.authLink, color: darkColors.primary }, footer: { position: "absolute", left: spacing.md, right: spacing.md, bottom: `${spacing.signupFooterBottomPercent}%`, flexDirection: "row", justifyContent: "center", alignItems: "center" }, footerText: { ...typography.authLink, color: darkColors.white } });
