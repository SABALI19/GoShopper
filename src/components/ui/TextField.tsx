import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { darkColors, radius, spacing, typography } from "../../theme";

type TextFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
};

export function TextField({
  label,
  value,
  placeholder,
  onChangeText,
  secureTextEntry,
  showPasswordToggle = false,
  passwordVisible = false,
  onTogglePasswordVisibility,
  keyboardType,
  autoCapitalize = "none",
  returnKeyType,
  onSubmitEditing,
}: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={darkColors.placeholder}
        returnKeyType={returnKeyType}
        secureTextEntry={showPasswordToggle ? !passwordVisible : secureTextEntry}
        selectionColor={darkColors.primary}
        style={[styles.input, showPasswordToggle && styles.passwordInput]}
        value={value}
      />
      {showPasswordToggle ? <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} accessibilityState={{ checked: passwordVisible }} hitSlop={10} onPress={onTogglePasswordVisibility} style={styles.visibilityButton}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={darkColors.placeholder} strokeWidth={1.8}>
          <Path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
          {passwordVisible ? <><Circle cx={12} cy={12} r={3} /><Path strokeLinecap="round" d="m4 4 16 16" /></> : <><Circle cx={12} cy={12} r={3} /></>}
        </Svg>
      </Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.loginInputGap,
  },
  label: {
    ...typography.fieldLabel,
    color: darkColors.white,
  },
  input: {
    ...typography.input,
    height: spacing.loginFieldHeight,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: darkColors.inputBorder,
    borderRadius: radius.input,
    backgroundColor: darkColors.inputSurface,
    color: darkColors.white,
  },
  inputContainer: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: spacing.xl },
  visibilityButton: { position: "absolute", right: spacing.md, height: spacing.loginFieldHeight, alignItems: "center", justifyContent: "center" },
});
