import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { router, useRouter } from "expo-router";
import { useSignIn } from "@clerk/expo";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { GoShopperBag } from "../../components/GoShopperBag";
import { darkColors, lightColors, spacing, typography } from "../../theme";
import { useState } from "react";

type LoginFormProps = {
  onSubmit: (identifier: string, password: string) => Promise<void>;
  busy?: boolean;
  errorMessage?: string;
};

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
          navigate: () => router.replace("/(customer)/(tabs)"),
        });
      } else {
        setRequestError("Your account needs another verification step to sign in.");
      }
    } catch {
      setRequestError("We couldn’t sign you in. Check your connection and try again.");
    }
  };

  const clerkError =
    errors.fields.identifier?.message ?? errors.fields.password?.message ?? "";

  return (
    <LoginForm
      busy={fetchStatus === "fetching"}
      errorMessage={requestError || clerkError}
      onSubmit={handleSubmit}
    />
  );
}

function LoginForm({ onSubmit, busy = false, errorMessage = "" }: LoginFormProps) {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  if (!fontsLoaded) return null;

  const submit = () => onSubmit(identifier.trim(), password);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.formArea, {
          top: `${spacing.loginFormTopPercent}%`,
          bottom: `${spacing.loginFormBottomPercent}%`,
        }]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
        </ScrollView>
      </KeyboardAvoidingView>

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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.dark,
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
