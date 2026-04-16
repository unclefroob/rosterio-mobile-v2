import React from "react";
import { View } from "react-native";

/**
 * Rosterio logomark — a staircase of two shift blocks cascading diagonally.
 * Represents the handover from one shift block to the next on a roster grid.
 *
 * Matches the SVG path from the web: M 0 0 H 18 V 16 H 36 V 26 H 18 V 10 H 0 Z
 * viewBox 36×26 → two rectangles:
 *   - Top-left block:    x[0–18],  y[0–10]
 *   - Bottom-right block: x[18–36], y[16–26]
 *
 * Pure React Native Views — no native modules, works in Expo Go.
 */
export default function RosterioMark({ size = 20, color = "#111111" }) {
  const totalH = size;
  const totalW = size * (36 / 26);
  const blockW = size * (18 / 26);
  const blockH = size * (10 / 26);

  return (
    <View style={{ width: totalW, height: totalH }}>
      {/* Top-left block */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: blockW,
          height: blockH,
          backgroundColor: color,
        }}
      />
      {/* Bottom-right block */}
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: blockW,
          height: blockH,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
