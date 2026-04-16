/**
 * LiquidTabBar — Apple iOS 26 floating glass pill tab bar
 *
 * Three-tier rendering:
 *   iOS 26+ native build:  GlassContainer > GlassView (expo-glass-effect)
 *                          ↳ Real UIVisualEffectView liquid glass material
 *   iOS <26 / Expo Go:     BlurView tint="systemChromeMaterial" intensity=100
 *                          ↳ UIBlurEffect.Style.systemChromeMaterial (system bar chrome)
 *   Android / fallback:    Frosted white surface
 *
 * Shape: floating pill — centered, 16pt horizontal margin, 34pt border radius.
 */

import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable,
} from "../utils/glassEffect";
import glassTheme from "../theme/glassTheme";

let BlurView;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

// Height of the visible tab row (not counting safe area or float gap)
export const TAB_BAR_CONTENT_HEIGHT = 56;

const ICONS = {
  Dashboard:   { focused: "home",          unfocused: "home-outline",          lib: "Ionicons" },
  Marketplace: { focused: "storefront",    unfocused: "storefront-outline",    lib: "MCI"      },
  MyShifts:    { focused: "calendar",      unfocused: "calendar-outline",      lib: "Ionicons" },
  Profile:     { focused: "person-circle", unfocused: "person-circle-outline", lib: "Ionicons" },
};

const LABELS = {
  Dashboard:   "Home",
  Marketplace: "Market",
  MyShifts:    "Shifts",
  Profile:     "Profile",
};

// ─── Single tab item ───────────────────────────────────────────
const TabItem = ({ route, isFocused, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const iconData = ICONS[route.name] || {
    focused: "help-circle",
    unfocused: "help-circle-outline",
    lib: "Ionicons",
  };

  const iconName = isFocused ? iconData.focused : iconData.unfocused;
  const label    = LABELS[route.name] || route.name;
  const IconComp = iconData.lib === "MCI" ? MaterialCommunityIcons : Ionicons;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.84, duration: 65, useNativeDriver: true }),
      Animated.spring(scaleAnim,  { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabItem}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}>
        <IconComp
          name={iconName}
          size={23}
          color={isFocused ? glassTheme.colors.primary : "rgba(0,0,0,0.32)"}
        />
        <Text style={[styles.label, isFocused && styles.labelActive]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Tab row shared across all render paths ────────────────────
const TabRow = ({ state, navigation }) => (
  <View style={styles.row}>
    {state.routes.map((route, index) => {
      const isFocused = state.index === index;

      const onPress = () => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event?.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };

      return (
        <TabItem
          key={route.key}
          route={route}
          isFocused={isFocused}
          onPress={onPress}
        />
      );
    })}
  </View>
);

// ─── Main tab bar component ────────────────────────────────────
const LiquidTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + 8;

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const systemBlur  = !liquidGlass && Platform.OS === "ios" && BlurView != null;

  if (liquidGlass) {
    return (
      <View style={[styles.outerWrapper, { paddingBottom: bottomPad }]}>
        <View style={styles.pillClip}>
          <GlassContainer>
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              style={styles.pillInner}
            >
              <View style={styles.specularHairline} pointerEvents="none" />
              <TabRow state={state} navigation={navigation} />
            </GlassView>
          </GlassContainer>
        </View>
      </View>
    );
  }

  if (systemBlur) {
    return (
      <View style={[styles.outerWrapper, { paddingBottom: bottomPad }]}>
        <View style={styles.pillClip}>
          <BlurView intensity={100} tint="systemChromeMaterial" style={styles.pillInner}>
            <LinearGradient
              colors={["rgba(255,255,255,0.60)", "rgba(255,255,255,0.0)"]}
              style={styles.specularGradient}
              pointerEvents="none"
            />
            <View style={styles.specularHairline} pointerEvents="none" />
            <TabRow state={state} navigation={navigation} />
          </BlurView>
        </View>
      </View>
    );
  }

  // Android / fallback — solid frosted surface
  return (
    <View style={[styles.outerWrapper, { paddingBottom: bottomPad }]}>
      <View style={[styles.pillClip, styles.pillFallback]}>
        <TabRow state={state} navigation={navigation} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Outer wrapper: provides the floating horizontal margins + bottom float gap
  outerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },

  // Pill clip: rounds the corners and clips the blur/glass content
  pillClip: {
    borderRadius: 34,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.55)",
    // Subtle shadow for the pill floating effect (Android: elevation)
    elevation: 8,
  },

  pillFallback: {
    backgroundColor: "rgba(248, 250, 255, 0.97)",
  },

  // Inner content of the pill — sized by the row
  pillInner: {},

  // 6px gradient specular — glass catching light at the top edge
  specularGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    zIndex: 3,
  },

  // Single-pixel white hairline — top edge specular reflection
  specularHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.75)",
    zIndex: 4,
  },

  row: {
    flexDirection: "row",
    height: TAB_BAR_CONTENT_HEIGHT,
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 5,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_BAR_CONTENT_HEIGHT,
  },

  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 3,
  },

  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(0,0,0,0.32)",
    letterSpacing: 0.1,
  },
  labelActive: {
    color: glassTheme.colors.primary,
    fontWeight: "600",
  },
});

export default LiquidTabBar;
