import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { darkColors, radius, spacing, typography } from "../../theme";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  description: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Icon color={darkColors.primary} name={icon} size={spacing.xl} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  iconBox: {
    width: spacing.xxl,
    height: spacing.xxl,
    marginBottom: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.round,
    backgroundColor: darkColors.primaryTint,
  },
  title: {
    ...typography.homeSection,
    color: darkColors.white,
    textAlign: "center",
  },
  description: {
    ...typography.homeBody,
    marginTop: spacing.xs,
    color: darkColors.mutedText,
    textAlign: "center",
  },
});
