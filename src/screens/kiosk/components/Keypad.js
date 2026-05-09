import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import glassTheme from "../../../theme/glassTheme";

/**
 * 3x4 numeric keypad with backspace.
 *
 * Big touch targets (≥72pt) for kiosk / glove use. Disabled state dims keys
 * during a network call. Accessibility labels announce digit / backspace /
 * submit so VoiceOver works on iPad kiosks.
 */
const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["clear", "0", "back"],
];

const KeypadKey = ({ value, label, onPress, disabled, icon, danger }) => (
  <Pressable
    onPress={() => !disabled && onPress(value)}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [
      styles.key,
      pressed && !disabled && styles.keyPressed,
      disabled && styles.keyDisabled,
    ]}
    hitSlop={8}
  >
    {icon ? (
      <Ionicons
        name={icon}
        size={28}
        color={danger ? glassTheme.colors.danger : glassTheme.colors.text.primary}
      />
    ) : (
      <Text style={styles.keyText}>{value}</Text>
    )}
  </Pressable>
);

const Keypad = ({ onDigit, onBackspace, onClear, disabled }) => {
  const handleKey = useCallback(
    (k) => {
      if (k === "back") onBackspace();
      else if (k === "clear") onClear();
      else onDigit(k);
    },
    [onDigit, onBackspace, onClear]
  );

  return (
    <View style={styles.grid}>
      {KEYS.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map((k) => {
            if (k === "back") {
              return (
                <KeypadKey
                  key={k}
                  value="back"
                  label="Backspace"
                  icon="backspace-outline"
                  onPress={handleKey}
                  disabled={disabled}
                />
              );
            }
            if (k === "clear") {
              return (
                <KeypadKey
                  key={k}
                  value="clear"
                  label="Clear"
                  icon="close-circle-outline"
                  onPress={handleKey}
                  disabled={disabled}
                  danger
                />
              );
            }
            return (
              <KeypadKey
                key={k}
                value={k}
                label={`Digit ${k}`}
                onPress={handleKey}
                disabled={disabled}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  key: {
    flex: 1,
    height: 84,
    borderRadius: glassTheme.radius.large,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    justifyContent: "center",
    alignItems: "center",
    ...glassTheme.shadows.medium,
  },
  keyPressed: {
    backgroundColor: glassTheme.colors.wash.black,
    transform: [{ scale: 0.97 }],
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyText: {
    fontSize: 32,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    fontFamily: "DMSans_600SemiBold",
    letterSpacing: -0.5,
  },
});

export default Keypad;
