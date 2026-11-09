import { StatusBar } from "expo-status-bar";
import { router, useRouter } from "expo-router";
import { useSignIn } from "@clerk/expo";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button } from "../../components/ui/Button";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { TextField } from "../../components/ui/TextField";
import { GoShopperBag } from "../../components/GoShopperBag";
import { darkColors, lightColors, radius, spacing, typography } from "../../theme";
import { useState } from "react";

type LoginFormProps = {
  onSubmit: (identifier: string, password: string) => Promise<void>;
  busy?: boolean;
  errorMessage?: string;
};

type SecondFactorStrategy = "email_code" | "phone_code" | "totp" | "backup_code" | "passkey";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function LoginScreen() {
  return publishableKey ? <ClerkLoginScreen /> : <MissingClerkKeyScreen />;
}

function MissingClerkKeyScreen() {
  return (
    <LoginForm
      onSubmit={async () => {
        Alert.alert(
          "Sign-in isn’t configured",
          "Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to mobile/.env to enable Clerk sign-in.",
        );
      }}
    />
  );
}

function ClerkLoginScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [requestError, setRequestError] = useState("");
  const [secondFactorRequired, setSecondFactorRequired] = useState(false);
  const [secondFactorStrategies, setSecondFactorStrategies] = useState<SecondFactorStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<SecondFactorStrategy | null>(null);
  const [startingSecondFactor, setStartingSecondFactor] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const startSecondFactor = async (strategy: SecondFactorStrategy) => {
    setRequestError("");
    setSecondFactorRequired(true);
    setSelectedStrategy(strategy);
    setVerificationCode("");

    try {
      setStartingSecondFactor(true);
      if (strategy === "phone_code") {
        const { error } = await signIn.mfa.sendPhoneCode();
        if (error) {
          setRequestError(error.message);
          return;
        }
      } else if (strategy === "email_code") {
        const { error } = await signIn.mfa.sendEmailCode();
        if (error) {
          setRequestError(error.message);
          return;
        }
      } else if (strategy === "passkey") {
        const { error } = await signIn.mfa.passkey();
        if (error) {
          setRequestError(error.message);
          return;
        }
        if (signIn.status === "complete") {
          await signIn.finalize({ navigate: () => router.replace("/") });
          return;
        }
      }

      setSecondFactorRequired(true);
    } catch {
      setRequestError("We couldn’t start verification. Try again or choose another method.");
    } finally {
      setStartingSecondFactor(false);
    }
  };

  const handleSubmit = async (identifier: string, password: string) => {
    setRequestError("");

    try {
      const credentials = identifier.includes("@")
        ? { emailAddress: identifier.trim(), password }
        : { phoneNumber: identifier.trim(), password };
      const { error } = await signIn.password(credentials);

      if (error) return;

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: () => router.replace("/"),
        });
      } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
        const available = [...new Set(
          (signIn.supportedSecondFactors || [])
            .map((factor) => factor.strategy)
            .filter((strategy): strategy is SecondFactorStrategy =>
              strategy === "email_code" || strategy === "phone_code" || strategy === "totp" || strategy === "backup_code" || strategy === "passkey",
            ),
        )];
        setSecondFactorStrategies(available);
        if (available.length === 0) {
          setRequestError("Clerk requires another sign-in method that isn’t available here. Contact support or ask your administrator to review the enabled verification methods.");
          return;
        }
        await startSecondFactor(available[0]);
      } else if (signIn.status === "needs_new_password") {
        setRequestError("Your password needs to be updated. Use Forgot Password to reset it, then sign in again.");
      } else {
        setRequestError("Sign-in needs another step that this screen couldn’t identify. Please try again or contact support.");
      }
    } catch {
      setRequestError("We couldn’t sign you in. Check your connection and try again.");
    }
  };

  const handleSecondFactor = async () => {
    if (!selectedStrategy || selectedStrategy === "passkey") return;
    if (!verificationCode.trim()) {
      setRequestError("Enter the verification code to continue.");
      return;
    }

    setRequestError("");
    try {
      const code = verificationCode.trim();
      const result = selectedStrategy === "phone_code"
        ? await signIn.mfa.verifyPhoneCode({ code })
        : selectedStrategy === "email_code"
          ? await signIn.mfa.verifyEmailCode({ code })
          : selectedStrategy === "totp"
            ? await signIn.mfa.verifyTOTP({ code })
            : await signIn.mfa.verifyBackupCode({ code });

      if (result.error) {
        setRequestError(result.error.message);
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: () => router.replace("/") });
      } else {
        setRequestError("That code didn’t complete verification. Check it and try again.");
      }
    } catch {
      setRequestError("We couldn’t verify that code. Check it and try again.");
    }
  };

  const returnToPassword = () => {
    signIn.reset();
    setSecondFactorRequired(false);
    setSecondFactorStrategies([]);
    setSelectedStrategy(null);
    setVerificationCode("");
    setRequestError("");
  };

  const clerkError =
    errors.fields.identifier?.message ?? errors.fields.password?.message ?? "";

  if (secondFactorRequired && selectedStrategy) {
    return (
      <SecondFactorForm
        busy={fetchStatus === "fetching" || startingSecondFactor}
        code={verificationCode}
        errorMessage={requestError}
        onBack={returnToPassword}
        onChangeCode={setVerificationCode}
        onSelectStrategy={startSecondFactor}
        onSubmit={handleSecondFactor}
        selectedStrategy={selectedStrategy}
        strategies={secondFactorStrategies}
      />
    );
  }

  return (
    <LoginForm
      busy={fetchStatus === "fetching"}
      errorMessage={requestError || clerkError}
      onSubmit={handleSubmit}
    />
  );
}

function SecondFactorForm({
  busy,
  code,
  errorMessage,
  onBack,
  onChangeCode,
  onSelectStrategy,
  onSubmit,
  selectedStrategy,
  strategies,
}: {
  busy: boolean;
  code: string;
  errorMessage: string;
  onBack: () => void;
  onChangeCode: (value: string) => void;
  onSelectStrategy: (strategy: SecondFactorStrategy) => Promise<void>;
  onSubmit: () => Promise<void>;
  selectedStrategy: SecondFactorStrategy;
  strategies: SecondFactorStrategy[];
}) {
  const { width, height } = useWindowDimensions();
  const strategyCopy: Record<SecondFactorStrategy, { label: string; description: string }> = {
    email_code: { label: "Email code", description: "Enter the code sent to your verified email address." },
    phone_code: { label: "SMS code", description: "Enter the code sent to your verified phone number." },
    totp: { label: "Authenticator app", description: "Enter the current code from your authenticator app." },
    backup_code: { label: "Backup code", description: "Enter one of the backup codes saved for your account." },
    passkey: { label: "Passkey", description: "Approve the sign-in with a passkey on this device." },
  };
  const codeStrategy = selectedStrategy !== "passkey";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.screenContent}>
        <Svg
          width={width}
          height={height * 0.49}
          viewBox="0 0 393 417"
          preserveAspectRatio="none"
          style={styles.headerShape}
        >
          <Path d="M0 0H393V275L0 417V0Z" fill={lightColors.primary} />
        </Svg>
        <View style={[styles.logo, { top: `${spacing.loginLogoTopPercent}%` }]}>
          <GoShopperBag size={100} />
        </View>
        <Text style={[styles.title, { top: `${spacing.loginTitleTopPercent}%` }]}>Verify It’s You</Text>

        <View style={[styles.formArea, styles.secondFactorArea]}>
          <RefreshableScrollView
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            contentContainerStyle={styles.secondFactorContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.secondFactorDescription}>{strategyCopy[selectedStrategy].description}</Text>
            {strategies.length > 1 ? (
              <View style={styles.factorOptions}>
                {strategies.map((strategy) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: strategy === selectedStrategy }}
                    key={strategy}
                    onPress={() => void onSelectStrategy(strategy)}
                    style={[styles.factorOption, strategy === selectedStrategy && styles.factorOptionSelected]}
                  >
                    <Text style={[styles.factorOptionText, strategy === selectedStrategy && styles.factorOptionTextSelected]}>
                      {strategyCopy[strategy].label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {codeStrategy ? (
              <TextField
                autoCapitalize="characters"
                keyboardType={selectedStrategy === "backup_code" ? "default" : "number-pad"}
                label={strategyCopy[selectedStrategy].label}
                onChangeText={onChangeCode}
                onSubmitEditing={() => void onSubmit()}
                placeholder="Enter verification code"
                returnKeyType="go"
                value={code}
              />
            ) : null}
            {selectedStrategy === "phone_code" || selectedStrategy === "email_code" ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void onSelectStrategy(selectedStrategy)}>
                <Text style={styles.resendCode}>Resend code</Text>
              </Pressable>
            ) : null}
            {errorMessage ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text> : null}
            <Button
              disabled={codeStrategy && !code.trim()}
              loading={busy}
              onPress={() => void (codeStrategy ? onSubmit() : onSelectStrategy("passkey"))}
              title={codeStrategy ? "Verify and Sign In" : "Continue with Passkey"}
            />
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.backToPassword}>
              <Text style={styles.signupLink}>Back to password sign in</Text>
            </Pressable>
          </RefreshableScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function LoginForm({ onSubmit, busy = false, errorMessage = "" }: LoginFormProps) {
  const { width, height } = useWindowDimensions();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => onSubmit(identifier.trim(), password);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <StatusBar style="light" />
      <View style={styles.screenContent}>
      <Svg
        width={width}
        height={height * 0.49}
        viewBox="0 0 393 417"
        preserveAspectRatio="none"
        style={styles.headerShape}
      >
        <Path d="M0 0H393V275L0 417V0Z" fill={lightColors.primary} />
      </Svg>

      <View style={[styles.logo, { top: `${spacing.loginLogoTopPercent}%` }]}>
        <GoShopperBag size={100} />
      </View>
      <Text style={[styles.title, { top: `${spacing.loginTitleTopPercent}%` }]}>
        Welcome To Go-Shopper
      </Text>

      <View style={[styles.formArea, {
          top: `${spacing.loginFormTopPercent}%`,
          bottom: `${spacing.loginFormBottomPercent}%`,
        }]}
      >
        <RefreshableScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          <TextField
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email Address/ Phone No"
            onChangeText={setIdentifier}
            placeholder="Enter your email Address/ Phone No"
            returnKeyType="next"
            value={identifier}
          />
          <TextField
            label="Password"
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder="Enter your password"
            returnKeyType="go"
            secureTextEntry
            value={password}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Forgot Password ?</Text>
          </Pressable>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.submitButton}>
            <Button
              disabled={!identifier.trim() || !password}
              loading={busy}
              onPress={submit}
              title="Log In"
            />
          </View>
        </RefreshableScrollView>
      </View>

      <View style={styles.signupRow}>
        <Text style={styles.signupPrompt}>Don’t have an account? </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(auth)/sign-up")}
        >
          <Text style={styles.signupLink}>Sign up</Text>
        </Pressable>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.dark,
  },
  screenContent: {
    flex: 1,
  },
  headerShape: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  logo: {
    position: "absolute",
    alignSelf: "center",
  },
  title: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    ...typography.authTitle,
    color: darkColors.white,
    textAlign: "center",
  },
  formArea: {
    position: "absolute",
    left: spacing.loginLabelInset,
    right: spacing.loginLabelInset,
  },
  formContent: {
    paddingBottom: spacing.md,
    gap: spacing.loginFieldGap,
  },
  forgotLink: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xxs,
  },
  forgotText: {
    ...typography.authLink,
    color: darkColors.primary,
  },
  errorText: {
    ...typography.input,
    color: darkColors.error,
  },
  submitButton: {
    marginTop: spacing.loginButtonTop,
  },
  secondFactorArea: {
    top: `${spacing.loginFormTopPercent}%`,
    bottom: `${spacing.loginFormBottomPercent}%`,
  },
  secondFactorContent: {
    paddingBottom: spacing.md,
    gap: spacing.loginFieldGap,
  },
  secondFactorDescription: {
    ...typography.authLink,
    color: darkColors.white,
  },
  factorOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  factorOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: darkColors.inputBorder,
    borderRadius: radius.round,
    backgroundColor: darkColors.inputSurface,
  },
  factorOptionSelected: {
    borderColor: darkColors.primary,
    backgroundColor: darkColors.storeSurface,
  },
  factorOptionText: {
    ...typography.input,
    color: darkColors.white,
  },
  factorOptionTextSelected: {
    color: darkColors.primary,
  },
  backToPassword: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  resendCode: {
    ...typography.authLink,
    color: darkColors.primary,
  },
  signupRow: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: `${spacing.loginFooterBottomPercent}%`,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupPrompt: {
    ...typography.authLink,
    color: darkColors.white,
  },
  signupLink: {
    ...typography.authLink,
    color: darkColors.primary,
  },
});
