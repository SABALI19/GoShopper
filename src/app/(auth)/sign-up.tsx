import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
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
import { darkColors, lightColors, spacing, typography } from "../../theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignUpScreen() {
  return publishableKey ? <ClerkSignUpScreen /> : <MissingClerkKeyScreen />;
}

function MissingClerkKeyScreen() {
  return (
    <SignUpForm
      onCreate={async () => {
        Alert.alert(
          "Sign-up isn’t configured",
          "Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to mobile/.env to enable Clerk sign-up.",
        );
        return false;
      }}
    />
  );
}

function ClerkSignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const [verificationMethod, setVerificationMethod] = useState<"email" | "phone" | null>(null);
  const [requestError, setRequestError] = useState("");

  const createAccount = async (
    fullName: string,
    identifier: string,
    password: string,
  ) => {
    setRequestError("");
    const [firstName, ...remainingName] = fullName.trim().split(/\s+/);
    const lastName = remainingName.join(" ");
    const isEmail = identifier.includes("@");
    const credentials = isEmail
      ? { emailAddress: identifier.trim(), password, firstName, lastName }
      : { phoneNumber: identifier.trim(), password, firstName, lastName };

    try {
      const { error } = await signUp.password(credentials);
      if (error) return false;

      const method = isEmail ? "email" : "phone";
      const sendResult = isEmail
        ? await signUp.verifications.sendEmailCode()
        : await signUp.verifications.sendPhoneCode();

      if (sendResult.error) {
        setRequestError("We couldn’t send your verification code. Check your details and try again.");
        return false;
      }

      setVerificationMethod(method);
      return true;
    } catch {
      setRequestError("We couldn’t create your account. Check your connection and try again.");
      return false;
    }
  };

  const verifyAccount = async (code: string) => {
    setRequestError("");
    try {
      const { error } = verificationMethod === "email"
        ? await signUp.verifications.verifyEmailCode({ code })
        : await signUp.verifications.verifyPhoneCode({ code });
      if (error) return;

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => router.replace("/"),
        });
      }
    } catch {
      setRequestError("That verification code didn’t work. Check it and try again.");
    }
  };

  const fieldError =
    errors.fields.emailAddress?.message ??
    errors.fields.phoneNumber?.message ??
    errors.fields.password?.message ??
    errors.fields.firstName?.message ??
    "";

  return (
    <SignUpForm
      busy={fetchStatus === "fetching"}
      errorMessage={requestError || fieldError}
      onCreate={createAccount}
      onVerify={verifyAccount}
      verifying={verificationMethod !== null}
      verificationMethod={verificationMethod}
    />
  );
}

type SignUpFormProps = {
  onCreate: (
    fullName: string,
    identifier: string,
    password: string,
  ) => Promise<boolean>;
  onVerify?: (code: string) => Promise<void>;
  busy?: boolean;
  errorMessage?: string;
  verifying?: boolean;
  verificationMethod?: "email" | "phone" | null;
};

function SignUpForm({
  onCreate,
  onVerify,
  busy = false,
  errorMessage = "",
  verifying = false,
  verificationMethod,
}: SignUpFormProps) {
  const { width, height } = useWindowDimensions();
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = async () => {
    setLocalError("");
    if (password !== confirmPassword) {
      setLocalError("Passwords don’t match.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    await onCreate(fullName, identifier, password);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <StatusBar style="light" />
      <View style={styles.screenContent}>
      <Svg
        width={width}
        height={height}
        viewBox="0 0 393 852"
        preserveAspectRatio="none"
        style={styles.backgroundShape}
      >
        <Path d="M0 0H393V202L0 344V0Z" fill={lightColors.primary} />
      </Svg>

      <View style={[styles.logo, { top: `${spacing.signupLogoTopPercent}%` }]}>
        <GoShopperBag size={100} />
      </View>
      <Text style={[styles.title, { top: `${spacing.signupTitleTopPercent}%` }]}>
        {verifying ? "Verify your Account" : "Create your Account"}
      </Text>

      <View style={[
          styles.formArea,
          {
            top: `${spacing.signupFormTopPercent}%`,
            bottom: `${spacing.signupFormBottomPercent}%`,
          },
        ]}>
        <RefreshableScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {verifying ? (
            <>
              <Text style={styles.verificationHint}>
                Enter the code sent to your {verificationMethod === "email" ? "email" : "phone"}.
              </Text>
              <TextField
                keyboardType="number-pad"
                label="Verification Code"
                onChangeText={setCode}
                placeholder="Enter your verification code"
                value={code}
              />
            </>
          ) : (
            <>
              <TextField
                autoCapitalize="words"
                label="Full Name"
                onChangeText={setFullName}
                placeholder="Enter your Full Name"
                returnKeyType="next"
                value={fullName}
              />
              <TextField
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
                placeholder="Enter your password"
                returnKeyType="next"
                secureTextEntry
                value={password}
              />
              <TextField
                label="Confirm Password"
                onChangeText={setConfirmPassword}
                placeholder="Enter your Confirm password"
                returnKeyType="go"
                secureTextEntry
                value={confirmPassword}
              />
            </>
          )}

          {errorMessage || localError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {localError || errorMessage}
            </Text>
          ) : null}

          <View style={styles.submitButton}>
            <Button
              disabled={verifying ? !code.trim() : !fullName.trim() || !identifier.trim() || !password || !confirmPassword}
              loading={busy}
              onPress={() =>
                verifying ? onVerify?.(code.trim()) : submit()
              }
              title={verifying ? "Verify" : "Sign Up"}
            />
          </View>
        </RefreshableScrollView>
      </View>

      {!verifying ? (
        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.loginLink}>Sign in</Text>
          </Pressable>
        </View>
      ) : null}
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
  backgroundShape: {
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
  verificationHint: {
    ...typography.input,
    color: darkColors.white,
  },
  errorText: {
    ...typography.input,
    color: darkColors.error,
  },
  submitButton: {
    marginTop: spacing.signupButtonTop,
  },
  loginRow: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: `${spacing.signupFooterBottomPercent}%`,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginPrompt: {
    ...typography.authLink,
    color: darkColors.white,
  },
  loginLink: {
    ...typography.authLink,
    color: darkColors.primary,
  },
});
