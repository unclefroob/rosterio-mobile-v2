/**
 * Safe wrapper around expo-glass-effect.
 *
 * In React 19 / New Architecture (SDK 53), requireNativeViewManager creates a
 * lazy proxy that throws at render time (not import time), so try/catch around
 * require() won't intercept it.
 *
 * Guard: skip the import entirely in Expo Go (executionEnvironment === 'storeClient').
 * In a native build (bare / standalone) the module loads normally.
 */

import { View } from "react-native";
import Constants from "expo-constants";

let GlassView = View;
let GlassContainer = View;
let isLiquidGlassAvailable = () => false;
let isGlassEffectAPIAvailable = () => false;

const isNativeBuild = Constants.executionEnvironment !== "storeClient";

if (isNativeBuild) {
  try {
    const mod = require("expo-glass-effect");
    GlassView = mod.GlassView;
    GlassContainer = mod.GlassContainer;
    isLiquidGlassAvailable = mod.isLiquidGlassAvailable;
    isGlassEffectAPIAvailable = mod.isGlassEffectAPIAvailable;
  } catch (_) {
    // Native module absent — stubs stay in place
  }
}

export { GlassView, GlassContainer, isLiquidGlassAvailable, isGlassEffectAPIAvailable };
