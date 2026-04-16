import React from "react";
import Svg, { Path } from "react-native-svg";

/**
 * Rosterio logomark — a staircase of two shift blocks cascading diagonally.
 * Represents the handover from one shift block to the next on a roster grid.
 * Ported from the web RosterioMark component (same path, same proportions).
 */
export default function RosterioMark({ size = 20, color = "#111111" }) {
  const height = size;
  const width = Math.round(size * (36 / 26) * 1000) / 1000;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 36 26"
      fill="none"
    >
      <Path fill={color} d="M 0 0 H 18 V 16 H 36 V 26 H 18 V 10 H 0 Z" />
    </Svg>
  );
}
