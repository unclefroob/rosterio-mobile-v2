/**
 * GlassCard — Apple Liquid Glass surface component
 *
 * Three-tier rendering:
 *   iOS 26+ (native build): expo-glass-effect GlassView — real UIVisualEffectView
 *   iOS <26:                expo-blur BlurView tint="light" — frosted translucent card
 *   Android / fallback:     solid high-opacity white surface
 */

import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "../utils/glassEffect";
import glassTheme from "../theme/glassTheme";

let BlurView;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

const GlassCard = ({
  children,
  intensity = glassTheme.blur.card,
  tint = "light",
  style,
  borderRadius = glassTheme.radius.large,
  padding = glassTheme.spacing.lg,
  borderWidth = 0.5,
  borderColor = glassTheme.glass.light.border,
  backgroundColor = glassTheme.glass.light.background,
  showSpecular = true,
  shadow = "medium",
  ...props
}) => {
  const shadowStyle = glassTheme.shadows[shadow] || glassTheme.shadows.medium;

  const specular = showSpecular ? (
    <View
      style={[
        styles.specular,
        { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius },
      ]}
      pointerEvents="none"
    />
  ) : null;

  const sharedStyle = [
    styles.container,
    shadowStyle,
    { borderRadius, padding, borderWidth, borderColor },
    style,
  ];

  // iOS 26+ — real liquid glass
  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  if (liquidGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={[...sharedStyle, { borderColor: "rgba(255,255,255,0.3)" }]}
        {...props}
      >
        {specular}
        {children}
      </GlassView>
    );
  }

  // iOS <26 — system blur
  if (Platform.OS === "ios" && BlurView) {
    return (
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[...sharedStyle, { backgroundColor }]}
        {...props}
      >
        {specular}
        {children}
      </BlurView>
    );
  }

  // Android / fallback
  return (
    <View
      style={[
        ...sharedStyle,
        {
          borderColor: "rgba(255,255,255,0.4)",
          backgroundColor: "rgba(255,255,255,0.94)",
        },
      ]}
      {...props}
    >
      {specular}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  specular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: glassTheme.glass.light.specular,
    zIndex: 1,
  },
});

export default GlassCard;
