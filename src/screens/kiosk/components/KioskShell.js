import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import glassTheme from "../../../theme/glassTheme";

/**
 * KioskShell — full-bleed gradient backdrop used by every kiosk screen.
 * Locks orientation-agnostic safe-area insets so big-touch UIs render
 * cleanly on tablets and phones alike.
 */
const KioskShell = ({ children, style, edges = ["top", "bottom"] }) => (
  <LinearGradient
    colors={glassTheme.colors.gradients.vivid}
    start={{ x: 0.1, y: 0 }}
    end={{ x: 0.9, y: 1 }}
    style={styles.bg}
  >
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {children}
    </SafeAreaView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
});

export default KioskShell;
