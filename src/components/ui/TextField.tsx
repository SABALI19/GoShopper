import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { darkColors, radius, spacing, typography } from "../../theme";

type TextFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
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
  keyboardType,
  autoCapitalize = "none",
  returnKeyType,
  onSubmitEditing,
}: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
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
        secureTextEntry={secureTextEntry}
        selectionColor={darkColors.primary}
        style={styles.input}
        value={value}
      />
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
});
