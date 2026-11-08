import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { Button } from "../../components/ui/Button";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { Icon } from "../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../theme";

type RecoveryStep = "identifier" | "code" | "password" | "success";
type RecoveryMethod = "email" | "phone";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function ForgotPasswordScreen() {
  return publishableKey ? <ClerkRecoveryFlow /> : <MissingClerkConfiguration />;
}

function ClerkRecoveryFlow() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const [step, setStep] = useState<RecoveryStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState<RecoveryMethod>("email");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requestError, setRequestError] = useState("");
  const codeInputRef = useRef<TextInput>(null);
  const busy = fetchStatus === "fetching";
  const codeCellCount = Math.max(4, code.length);

  const sendCode = async (resend = false) => {
    const value = identifier.trim();
    if (!value) {
      setRequestError("Enter the email address or phone number on your account.");
      return;
    }
    setRequestError("");
    const selectedMethod: RecoveryMethod = value.includes("@") ? "email" : "phone";
    try {
      if (!resend) {
        const { error } = await signIn.create({ identifier: value });
        if (error) {
          setRequestError(error.message);
          return;
        }
        setMethod(selectedMethod);
      }
      const activeMethod = resend ? method : selectedMethod;
      const { error } = activeMethod === "email"
        ? await signIn.resetPasswordEmailCode.sendCode()
        : await signIn.resetPasswordPhoneCode.sendCode();
      if (error) {
        setRequestError(error.message);
        return;
      }
      if (!resend) setStep("code");
    } catch (error) {
      setRequestError(getErrorMessage(error));
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setRequestError("Enter the verification code we sent you.");
      return;
    }
    setRequestError("");
    try {
      const { error } = method === "email"
        ? await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() })
        : await signIn.resetPasswordPhoneCode.verifyCode({ code: code.trim() });
      if (error) {
        setRequestError(error.message);
        return;
      }
      setStep("password");
    } catch (error) {
      setRequestError(getErrorMessage(error));
    }
  };

  const resetPassword = async () => {
    if (!password || !confirmPassword) {
      setRequestError("Enter and confirm your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setRequestError("The passwords do not match.");
      return;
    }
    setRequestError("");
    try {
      const { error } = method === "email"
        ? await signIn.resetPasswordEmailCode.submitPassword({ password })
        : await signIn.resetPasswordPhoneCode.submitPassword({ password });
      if (error) {
        setRequestError(error.message);
        return;
      }
      if (signIn.status !== "complete") {
        setRequestError("Your account needs another verification step. Please try signing in after resetting your password.");
        return;
      }
      const { error: finalizeError } = await signIn.finalize({
        navigate: async () => {
          setStep("success");
        },
      });
      if (finalizeError) setRequestError(finalizeError.message);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    }
  };

  const goBack = async () => {
    setRequestError("");
    if (step === "identifier") {
      router.back();
      return;
    }
    if (step === "code") {
      await signIn.reset();
      setCode("");
      setStep("identifier");
      return;
    }
    if (step === "password") {
      setPassword("");
      setConfirmPassword("");
      setStep("code");
    }
  };

  if (step === "success") {
    return (
      <SafeAreaView style={styles.successScreen}>
        <StatusBar style="light" />
        <View style={styles.successCard}>
          <SuccessArtwork />
          <Text style={styles.successTitle}>Password Update{"\n"}Successfully</Text>
          <Text style={styles.successDescription}>Your password has been changed. Continue to your Go-Shopper account.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/(tabs)")} style={styles.successButton}>
            <Text style={styles.successButtonText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
            <Icon color={darkColors.white} name="back" size={spacing.md} />
          </Pressable>
        </View>

        {step === "identifier" ? (
          <>
            <RefreshableScrollView contentContainerStyle={styles.identifierContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <LockArtwork />
              <Text style={styles.centerTitle}>Forgot Password</Text>
              <Text style={styles.centerDescription}>Enter your email address/ Phone No for recovery of your account</Text>
              <TextInput
                accessibilityLabel="Email address or phone number"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(value) => { setIdentifier(value); setRequestError(""); }}
                placeholder="Enter your Email/Phone Number"
                placeholderTextColor={darkColors.placeholder}
                returnKeyType="send"
                onSubmitEditing={() => void sendCode()}
                style={styles.identifierInput}
                value={identifier}
              />
              {requestError ? <Text accessibilityRole="alert" style={styles.errorText}>{requestError}</Text> : null}
            </RefreshableScrollView>
            <View style={styles.bottomAction}>
              <Button disabled={!identifier.trim()} loading={busy} onPress={() => void sendCode()} title="Send Verification Code" />
            </View>
          </>
        ) : null}

        {step === "code" ? (
          <>
            <RefreshableScrollView contentContainerStyle={styles.codeContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <ShieldArtwork />
              <Text style={styles.centerTitle}>Verification Code</Text>
              <Text style={styles.centerDescription}>Enter the verification code that we have sent to you</Text>
              <Pressable accessibilityLabel="Enter verification code" onPress={() => codeInputRef.current?.focus()} style={[styles.codeCells, codeCellCount > 4 && styles.codeCellsCompact]}>
                <TextInput
                  ref={codeInputRef}
                  accessibilityLabel="Verification code"
                  autoComplete="one-time-code"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) => { setCode(value.replace(/\D/g, "")); setRequestError(""); }}
                  style={styles.hiddenCodeInput}
                  textContentType="oneTimeCode"
                  value={code}
                />
                {Array.from({ length: codeCellCount }, (_, index) => (
                  <View key={index} style={styles.codeCell}>
                    <Text style={styles.codeDigit}>{code[index] ?? ""}</Text>
                  </View>
                ))}
              </Pressable>
              {requestError ? <Text accessibilityRole="alert" style={styles.errorText}>{requestError}</Text> : null}
              <View style={styles.resendRow}>
                <Text style={styles.resendPrompt}>If you did not receive a code ? </Text>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sendCode(true)}>
                  <Text style={styles.resendAction}>Resend Code</Text>
                </Pressable>
              </View>
            </RefreshableScrollView>
            <View style={styles.bottomAction}>
              <Button disabled={code.length < 4} loading={busy} onPress={() => void verifyCode()} title="Verify code" />
            </View>
          </>
        ) : null}

        {step === "password" ? (
          <>
            <RefreshableScrollView contentContainerStyle={styles.passwordContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.passwordTitle}>Create New Password</Text>
              <View style={styles.passwordFields}>
                <PasswordField
                  label="New Password"
                  onChangeText={(value) => { setPassword(value); setRequestError(""); }}
                  placeholder="Enter your New Password"
                  secure={!showPassword}
                  toggleVisibility={() => setShowPassword((visible) => !visible)}
                  value={password}
                />
                <PasswordField
                  label="Confirm Password"
                  onChangeText={(value) => { setConfirmPassword(value); setRequestError(""); }}
                  placeholder="Enter your Confirm Password"
                  secure={!showConfirmPassword}
                  toggleVisibility={() => setShowConfirmPassword((visible) => !visible)}
                  value={confirmPassword}
                />
              </View>
              {requestError ? <Text accessibilityRole="alert" style={styles.errorText}>{requestError}</Text> : null}
            </RefreshableScrollView>
            <View style={styles.bottomAction}>
              <Button disabled={!password || !confirmPassword} loading={busy} onPress={() => void resetPassword()} title="Reset Password" />
            </View>
          </>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({ label, value, onChangeText, placeholder, secure, toggleVisibility }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure: boolean;
  toggleVisibility: () => void;
}) {
  return (
    <View style={styles.passwordField}>
      <Text style={styles.passwordLabel}>{label}</Text>
      <View style={styles.passwordInputWrap}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={darkColors.placeholder}
          secureTextEntry={secure}
          style={styles.passwordInput}
          value={value}
        />
        <Pressable accessibilityLabel={secure ? "Show password" : "Hide password"} onPress={toggleVisibility} style={styles.visibilityButton}>
          <Icon color={darkColors.mutedText} name={secure ? "eyeOff" : "eye"} size={spacing.md} />
        </Pressable>
      </View>
    </View>
  );
}

function LockArtwork() {
  return (
    <Svg width={spacing.recoveryArtworkLockWidth} height={spacing.recoveryArtworkLockHeight} viewBox="0 0 102 136" style={styles.lockArtwork}>
      <Path d="M22 58V37a29 29 0 0 1 58 0v21H67V37a16 16 0 0 0-32 0v21H22Z" fill={darkColors.primary} />
      <Path d="M15 58h72a13 13 0 0 1 13 13v52a13 13 0 0 1-13 13H15A13 13 0 0 1 2 123V71a13 13 0 0 1 13-13Z" fill={darkColors.primary} />
      <Circle cx="51" cy="87" r="13" fill={darkColors.dark} />
      <Path d="M51 98v19" stroke={darkColors.dark} strokeWidth="8" strokeLinecap="round" />
    </Svg>
  );
}

function ShieldArtwork() {
  return (
    <Svg width={spacing.recoveryArtworkShieldWidth} height={spacing.recoveryArtworkShieldHeight} viewBox="0 0 130 152" style={styles.shieldArtwork}>
      <Path d="M12 12h106v54c0 38-19 56-53 74C31 122 12 104 12 66V12Z" fill="none" stroke={darkColors.primary} strokeWidth="11" />
      <Path d="m37 76 17 17 39-39" fill="none" stroke={darkColors.primary} strokeWidth="11" strokeLinecap="square" strokeLinejoin="miter" />
    </Svg>
  );
}

function SuccessArtwork() {
  return (
    <View style={styles.successRings}>
      <View style={styles.successOuterRing}>
        <View style={styles.successCircle}>
          <Svg width={spacing.xl} height={spacing.xl} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="9.5" fill="none" stroke={darkColors.white} strokeWidth="1.5" />
            <Path d="m7.5 12.5 3 3 6-7" fill="none" stroke={darkColors.white} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </View>
    </View>
  );
}

function MissingClerkConfiguration() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.md} />
        </Pressable>
      </View>
      <View style={styles.missingState}>
        <Text style={styles.passwordTitle}>Password recovery unavailable</Text>
        <Text style={styles.centerDescription}>Add the Clerk publishable key to enable password recovery.</Text>
      </View>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  keyboardArea: { flex: 1 },
  header: { height: spacing.recoveryBackSize + spacing.recoveryTopInset, paddingHorizontal: spacing.recoveryPageInset, paddingTop: spacing.recoveryTopInset },
  backButton: { width: spacing.recoveryBackSize, height: spacing.recoveryBackSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  identifierContent: { alignItems: "center", paddingHorizontal: spacing.recoveryPageInset, paddingTop: spacing.recoveryArtworkTop, paddingBottom: spacing.xl },
  lockArtwork: { marginBottom: spacing.recoveryTitleTop },
  shieldArtwork: { marginBottom: spacing.sm },
  centerTitle: { ...typography.recoveryTitle, color: darkColors.white, textAlign: "center" },
  centerDescription: { ...typography.recoveryDescription, marginTop: spacing.recoveryDescriptionTop, color: darkColors.white, textAlign: "center" },
  identifierInput: { width: "100%", height: spacing.loginFieldHeight, marginTop: spacing.recoveryFieldTop, paddingHorizontal: spacing.sm, borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface, color: darkColors.white, ...typography.input },
  bottomAction: { paddingHorizontal: spacing.recoveryPageInset, paddingTop: spacing.xs, paddingBottom: spacing.xs },
  codeContent: { alignItems: "center", paddingHorizontal: spacing.recoveryPageInset, paddingTop: spacing.recoveryArtworkTop, paddingBottom: spacing.xl },
  codeCells: { position: "relative", marginTop: spacing.recoveryCodeTop, flexDirection: "row", justifyContent: "center", gap: spacing.recoveryCodeGap },
  codeCellsCompact: { gap: spacing.recoveryCodeGapCompact },
  hiddenCodeInput: { position: "absolute", zIndex: 1, width: "100%", height: "100%", opacity: 0 },
  codeCell: { width: spacing.recoveryCodeCellSize, height: spacing.recoveryCodeCellSize, alignItems: "center", justifyContent: "center", borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.primary, borderRadius: radius.sm, backgroundColor: darkColors.storeSurface },
  codeDigit: { ...typography.recoveryLabel, color: darkColors.white },
  resendRow: { marginTop: spacing.recoveryResendTop, flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  resendPrompt: { ...typography.recoveryCaption, color: darkColors.mutedText },
  resendAction: { ...typography.recoveryDescription, color: darkColors.primary },
  errorText: { ...typography.recoveryCaption, width: "100%", marginTop: spacing.sm, color: darkColors.error, textAlign: "center" },
  passwordContent: { paddingHorizontal: spacing.recoveryPageInset, paddingTop: spacing.recoveryNewPasswordTop, paddingBottom: spacing.xl },
  passwordTitle: { ...typography.recoveryTitle, color: darkColors.white },
  passwordFields: { marginTop: spacing.lg, gap: spacing.recoveryPasswordFieldGap },
  passwordField: { gap: spacing.xs },
  passwordLabel: { ...typography.recoveryLabel, color: darkColors.white },
  passwordInputWrap: { height: spacing.loginFieldHeight, flexDirection: "row", alignItems: "center", borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface },
  passwordInput: { flex: 1, height: "100%", paddingHorizontal: spacing.sm, ...typography.input, color: darkColors.white },
  visibilityButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: darkColors.dark },
  successCard: { width: "100%", maxWidth: spacing.recoverySuccessCardWidth, minHeight: spacing.recoverySuccessCardHeight, padding: spacing.lg, alignItems: "center", justifyContent: "center", borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.warning, borderRadius: radius.lg, backgroundColor: darkColors.surface },
  successRings: { width: spacing.recoverySuccessRingSize, height: spacing.recoverySuccessRingSize, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm, borderRadius: radius.round, backgroundColor: darkColors.storeSurface },
  successOuterRing: { width: spacing.recoverySuccessCircleSize, height: spacing.recoverySuccessCircleSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.success },
  successCircle: { width: spacing.xxl, height: spacing.xxl, alignItems: "center", justifyContent: "center", borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.successSurface, borderRadius: radius.round },
  successTitle: { ...typography.recoveryTitle, marginTop: spacing.xs, color: darkColors.white, textAlign: "center" },
  successDescription: { ...typography.recoveryCaption, marginTop: spacing.xs, color: darkColors.mutedText, textAlign: "center" },
  successButton: { width: "100%", maxWidth: spacing.recoverySuccessButtonWidth, height: spacing.recoverySuccessButtonHeight, marginTop: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: darkColors.primary },
  successButtonText: { ...typography.button, color: darkColors.white },
  missingState: { flex: 1, padding: spacing.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm },
});
