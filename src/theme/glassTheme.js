/**
 * Apple Liquid Glass Theme — iOS 26
 * Translucent, specular glass surfaces with indigo-tinted shadows and ink typography.
 */

export const glassTheme = {
  // Glass surface colors — rgba for layering over blurred backgrounds
  glass: {
    light: {
      background: "rgba(255, 255, 255, 0.72)",
      backgroundStrong: "rgba(255, 255, 255, 0.85)",
      backgroundSubtle: "rgba(255, 255, 255, 0.45)",
      border: "rgba(255, 255, 255, 0.65)",
      borderStrong: "rgba(255, 255, 255, 0.85)",
      borderSubtle: "rgba(255, 255, 255, 0.32)",
      specular: "rgba(255, 255, 255, 0.92)",      // Top-edge light refraction
    },
    dark: {
      background: "rgba(28, 28, 32, 0.72)",
      backgroundStrong: "rgba(28, 28, 32, 0.88)",
      backgroundSubtle: "rgba(28, 28, 32, 0.45)",
      border: "rgba(255, 255, 255, 0.10)",
      borderStrong: "rgba(255, 255, 255, 0.18)",
      borderSubtle: "rgba(255, 255, 255, 0.06)",
      specular: "rgba(255, 255, 255, 0.14)",
    },
  },

  // Semantic colors
  colors: {
    primary: "#111111",         // Ink — main CTA, active states
    primaryDark: "#333333",
    secondary: "#5856D6",       // Apple purple

    success: "#30D158",         // iOS 26 green
    warning: "#FF9F0A",         // iOS 26 orange
    danger: "#FF453A",          // iOS 26 red
    info: "#636AF1",            // Indigo — matches shadow tint

    text: {
      primary: "rgba(0, 0, 0, 0.88)",
      secondary: "rgba(0, 0, 0, 0.52)",
      tertiary: "rgba(0, 0, 0, 0.34)",
      inverse: "rgba(255, 255, 255, 0.95)",
      placeholder: "rgba(0, 0, 0, 0.28)",
    },

    background: {
      // White/neutral — matches shiftos web (#ffffff / #f7f7f7)
      primary: "#FFFFFF",
      screen: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.92)",
      tertiary: "#F7F7F7",
    },

    // Screen gradient stops (use with expo-linear-gradient)
    gradients: {
      screen:  ["#FFFFFF", "#F7F7F7"],          // White → light wash
      vivid:   ["#FFFFFF", "#F7F7F7", "#FFFFFF"], // White → wash → white
      auth:    ["#FFFFFF", "#F7F7F7", "#FFFFFF"], // White auth screen
    },

    // Tinted icon container washes
    wash: {
      black:  "rgba(17,  17,  17,  0.08)",
      blue:   "rgba(99,  102, 241, 0.12)",
      green:  "rgba(48,  209, 88,  0.12)",
      orange: "rgba(255, 159, 10,  0.12)",
      red:    "rgba(255, 69,  58,  0.12)",
      purple: "rgba(88,  86,  214, 0.12)",
    },
  },

  // Blur intensities for expo-blur
  blur: {
    light:      20,
    medium:     50,
    heavy:      70,
    extraHeavy: 90,
    tabBar:     72,
    card:       50,
    header:     60,
  },

  // Border radii
  radius: {
    small:   10,
    medium:  14,
    large:   20,    // Standard card
    xlarge:  28,    // Tab bar, large containers
    pill:    9999,
  },

  // Spacing scale
  spacing: {
    xs:  4,
    sm:  8,
    md:  12,
    lg:  16,
    xl:  20,
    xxl: 24,
  },

  // Shadows — indigo-tinted for depth (not flat black)
  shadows: {
    small: {
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 2,
    },
    medium: {
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.11,
      shadowRadius: 14,
      elevation: 4,
    },
    large: {
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 22,
      elevation: 8,
    },
    xlarge: {
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.20,
      shadowRadius: 36,
      elevation: 12,
    },
  },

  // Legacy single-value shadow (kept for compatibility)
  shadow: {
    color: "#6366F1",
    offset: { width: 0, height: 4 },
    opacity: 0.11,
    radius: 14,
    elevation: 4,
  },

  // Typography — DM Sans (matches shiftos web)
  typography: {
    fontFamily: {
      regular:  "DMSans_400Regular",
      medium:   "DMSans_500Medium",
      semiBold: "DMSans_600SemiBold",
      bold:     "DMSans_700Bold",
    },
  },

  // Border defaults
  border: {
    width: 0.5,
    color: "rgba(0, 0, 0, 0.08)",          // Dividers on light backgrounds
    glassColor: "rgba(255, 255, 255, 0.65)", // Glass card outlines
  },
};

export default glassTheme;
