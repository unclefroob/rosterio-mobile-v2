import { StyleSheet, Platform } from "react-native";
import glassTheme from "../theme/glassTheme";

/**
 * Utility functions for creating glassmorphism styles
 */

/**
 * Creates a glass card style
 */
export const createGlassCard = (options = {}) => {
  const {
    intensity = glassTheme.blur.medium,
    borderRadius = glassTheme.radius.large,
    padding = glassTheme.spacing.lg,
    borderWidth = 0.5,
    useDark = false,
    shadow = "medium",
  } = options;

  const glassColors = useDark ? glassTheme.glass.dark : glassTheme.glass.light;
  const shadowStyle = glassTheme.shadows[shadow] || glassTheme.shadows.medium;

  if (Platform.OS === "ios") {
    return {
      borderRadius,
      padding,
      borderWidth,
      borderColor: glassColors.border,
      backgroundColor: glassColors.background,
      overflow: "hidden",
      ...shadowStyle,
    };
  }

  // Android fallback
  return {
    borderRadius,
    padding,
    borderWidth,
    borderColor: glassColors.border,
    backgroundColor: glassColors.backgroundStrong, // More opaque on Android
    overflow: "hidden",
    ...shadowStyle,
  };
};

/**
 * Creates a glass input style
 */
export const createGlassInput = (options = {}) => {
  const {
    borderRadius = glassTheme.radius.medium,
    padding = glassTheme.spacing.md,
    useDark = false,
  } = options;

  const glassColors = useDark ? glassTheme.glass.dark : glassTheme.glass.light;

  return {
    borderRadius,
    paddingHorizontal: padding,
    paddingVertical: padding,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "rgba(0,0,0,0.04)",
    fontSize: 14,
    color: glassTheme.colors.text.primary,
  };
};

/**
 * Creates a glass button style
 */
export const createGlassButton = (options = {}) => {
  const {
    borderRadius = glassTheme.radius.medium,
    padding = glassTheme.spacing.md,
    variant = "primary", // primary, secondary, success, danger
    useDark = false,
  } = options;

  const glassColors = useDark ? glassTheme.glass.dark : glassTheme.glass.light;
  const colorMap = {
    primary: glassTheme.colors.primary,
    secondary: glassTheme.colors.secondary,
    success: glassTheme.colors.success,
    danger: glassTheme.colors.danger,
  };

  return {
    borderRadius,
    paddingHorizontal: padding * 2,
    paddingVertical: padding,
    backgroundColor: colorMap[variant] || colorMap.primary,
    borderWidth: 0,
    ...glassTheme.shadows.medium,
  };
};

/**
 * Creates a glass container style
 */
export const createGlassContainer = (options = {}) => {
  const {
    useDark = false,
    padding = 0,
  } = options;

  const glassColors = useDark ? glassTheme.glass.dark : glassTheme.glass.light;

  return {
    flex: 1,
    backgroundColor: glassTheme.colors.background.primary,
    padding,
  };
};

export default {
  createGlassCard,
  createGlassInput,
  createGlassButton,
  createGlassContainer,
};

