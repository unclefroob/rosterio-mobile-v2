import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RosterioMark from "../components/RosterioMark";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView, isLiquidGlassAvailable } from "../utils/glassEffect";
import glassTheme from "../theme/glassTheme";

let BlurView;
try { BlurView = require("expo-blur").BlurView; } catch (e) { BlurView = null; }

const SplashScreen = () => {
  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const useBlur = !liquidGlass && Platform.OS === "ios" && BlurView != null;
  const GlassContainer = liquidGlass ? GlassView : useBlur ? BlurView : View;
  const glassProps = liquidGlass
    ? { glassEffectStyle: "regular" }
    : useBlur
    ? { intensity: 55, tint: "light" }
    : {};

  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.vivid}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.bg}
    >
      <GlassContainer
        {...glassProps}
        style={[styles.card, !useBlur && styles.cardFallback]}
      >
        <View style={styles.specular} pointerEvents="none" />

        <View style={styles.logoCircle}>
          <RosterioMark size={36} color={glassTheme.colors.primary} />
        </View>

        <Text style={styles.title}>Rosterio</Text>
        <Text style={styles.subtitle}>Shift Marketplace</Text>

        <ActivityIndicator
          size="small"
          color={glassTheme.colors.primary}
          style={styles.loader}
        />
      </GlassContainer>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 52,
    borderRadius: glassTheme.radius.xlarge,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    backgroundColor: glassTheme.glass.light.background,
    ...glassTheme.shadows.large,
  },
  cardFallback: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: glassTheme.colors.wash.black,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
    ...glassTheme.shadows.large,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: glassTheme.colors.text.tertiary,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  loader: {
    marginTop: 28,
  },
});

export default SplashScreen;
