/**
 * LiquidTabBar — Apple iOS 26 floating glass pill tab bar
 *
 * Layout (bottom → top):
 *   1. Full-width blur scrim — covers the safe area + pill zone, blurs screen
 *      content so it doesn't visually bleed into the tab bar area.
 *   2. Floating pill — centered with 16pt margins, frosted blur inside.
 *   3. Active tab indicator — white pill behind the focused tab item.
 *
 * The outer wrapper is position:absolute from the screen bottom, full width,
 * so screens render full-height and there is no white chin below the tab bar.
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

// Height of the gradient that fades the blur in from the top of the scrim.
// The gradient sits at the very top of the scrim zone, going from white
// (completely hiding the hard blur edge) to transparent (full blur visible).
const SCRIM_FADE_HEIGHT = 64;

let BlurView;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

// Height of the visible tab row (not counting safe area or float gap)
export const TAB_BAR_CONTENT_HEIGHT = 56;

// Total bottom inset screens should pad their scroll content by
export const TAB_BAR_BOTTOM_INSET = TAB_BAR_CONTENT_HEIGHT + 16;

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
      <Animated.View style={[styles.tabInner, isFocused && styles.tabInnerFocused, { transform: [{ scale: scaleAnim }] }]}>
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

// ─── Tab row ───────────────────────────────────────────────────
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
        <TabItem key={route.key} route={route} isFocused={isFocused} onPress={onPress} />
      );
    })}
  </View>
);

// ─── Main component ────────────────────────────────────────────
const LiquidTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  // Pill floats 12pt above the home indicator
  const pillBottom = insets.bottom + 12;
  // Scrim covers safe area + pill height + 6pt top gap
  const scrimHeight = insets.bottom + TAB_BAR_CONTENT_HEIGHT + 18;

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  // Reusable scrim + fade layer used in both render paths
  const ScrimLayers = () => (
    <>
      {/* Full-width blur scrim behind pill + safe area zone */}
      {BlurView && (
        <BlurView
          intensity={28}
          tint="light"
          style={[styles.scrim, { height: scrimHeight }]}
          pointerEvents="none"
        />
      )}
      {/*
        Gradient fade at the top of the scrim — eliminates the hard blur cutoff.

        How it works: the gradient sits at the very top of the scrim zone.
        Its top is white (fully hiding the blur edge so it blends with the
        screen background), and it fades to transparent going downward.
        The blur then "reveals" itself gradually as the gradient fades out,
        mimicking the CAGradientLayer mask used in native iOS apps.
      */}
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)"]}
        style={[styles.scrimFade, { bottom: scrimHeight, height: SCRIM_FADE_HEIGHT }]}
        pointerEvents="none"
      />
    </>
  );

  if (liquidGlass) {
    return (
      <View style={styles.outerWrapper} pointerEvents="box-none">
        <ScrimLayers />
        <View style={[styles.pillWrapper, { bottom: pillBottom }]}>
          <View style={styles.pill}>
            <GlassContainer>
              <GlassView glassEffectStyle="regular" isInteractive style={styles.pillInner}>
                <View style={styles.specularHairline} pointerEvents="none" />
                <TabRow state={state} navigation={navigation} />
              </GlassView>
            </GlassContainer>
          </View>
        </View>
      </View>
    );
  }

  // Expo Go / non-native: frosted pill + blur scrim with gradient fade
  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      <ScrimLayers />
      <View style={[styles.pillWrapper, { bottom: pillBottom }]}>
        <View style={styles.pill}>
          {BlurView && (
            <BlurView
              intensity={50}
              tint="light"
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <View style={[StyleSheet.absoluteFillObject, styles.pillTint]} pointerEvents="none" />
          <View style={styles.specularHairline} pointerEvents="none" />
          <TabRow state={state} navigation={navigation} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Full-screen absolute anchor — sits over screen content, box-none so
  // touches pass through the transparent areas.
  outerWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },

  // Full-width blur band anchored to screen bottom.
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  // White-to-transparent gradient that fades the top edge of the blur scrim.
  // Positioned at the top of the scrim zone (calculated inline).
  scrimFade: {
    position: "absolute",
    left: 0,
    right: 0,
  },

  // Pill is absolutely positioned with horizontal margins
  pillWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
  },

  // Floating glass pill
  pill: {
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  // Semi-transparent tint over the pill blur
  pillTint: {
    backgroundColor: "rgba(255,255,255,0.30)",
  },

  pillInner: {},

  specularHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.9)",
    zIndex: 4,
  },

  row: {
    flexDirection: "row",
    height: TAB_BAR_CONTENT_HEIGHT,
    alignItems: "center",
    paddingHorizontal: 4,
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

  tabInnerFocused: {
    backgroundColor: "rgba(255,255,255,0.78)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
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
