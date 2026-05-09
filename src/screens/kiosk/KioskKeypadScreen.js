import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import KioskShell from "./components/KioskShell";
import Keypad from "./components/Keypad";
import RosterioMark from "../../components/RosterioMark";
import { useKiosk } from "../../context/KioskContext";
import {
  kioskClockInPreview,
  kioskClockInCommit,
  kioskClockOutPreview,
  kioskClockOutCommit,
  kioskBreakStart,
  kioskBreakEnd,
} from "../../services/kioskApiHelper";
import glassTheme from "../../theme/glassTheme";

const PIN_LENGTH = 4;
const SUCCESS_HOLD_MS = 3000;
const ACTIONS = [
  { key: "clockIn", label: "Clock in", icon: "log-in-outline", color: glassTheme.colors.success },
  { key: "clockOut", label: "Clock out", icon: "log-out-outline", color: glassTheme.colors.primary },
  { key: "breakStart", label: "Start break", icon: "pause-circle-outline", color: glassTheme.colors.warning },
  { key: "breakEnd", label: "End break", icon: "play-circle-outline", color: glassTheme.colors.info },
];

const friendlyError = (status, message) => {
  if (!status && !message) return "Connection lost — please retry.";
  if (status === 401) return "PIN not recognized — try again.";
  if (status === 404) return "No shift today for that worker.";
  if (status === 409) return message || "Already clocked in.";
  if (status === 410) return "That confirmation expired. Please start over.";
  if (status === 423) return "Worker is locked. Ask a manager.";
  return message || "Something went wrong.";
};

/**
 * KioskKeypadScreen
 *
 * The single screen that drives the entire kiosk lifecycle:
 *   1. Pick action (clock in / clock out / break start / break end)
 *   2. Enter 4-digit PIN
 *   3. Two-phase clock in/out: confirm worker → commit
 *      Single-phase break: success straight after submit
 *   4. Auto-return to action picker after SUCCESS_HOLD_MS
 *
 * Long-press the logo for 5s to open the manager-auth-gated exit flow.
 */
const KioskKeypadScreen = () => {
  const { exitKioskMode } = useKiosk();
  const [stage, setStage] = useState("pickAction"); // pickAction | enterPin | confirm | success | error
  const [action, setAction] = useState(null);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null); // { actionToken, worker, shift } for clock in/out
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [longPressing, setLongPressing] = useState(false);
  const successFade = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;
  const longPressTimer = useRef(null);
  const autoReturnTimer = useRef(null);

  // Reset to action picker
  const resetToStart = useCallback(() => {
    if (autoReturnTimer.current) {
      clearTimeout(autoReturnTimer.current);
      autoReturnTimer.current = null;
    }
    setStage("pickAction");
    setAction(null);
    setPin("");
    setPreview(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    setSubmitting(false);
    successFade.setValue(0);
    successScale.setValue(0.7);
  }, [successFade, successScale]);

  useEffect(() => {
    return () => {
      if (autoReturnTimer.current) clearTimeout(autoReturnTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────
  const handlePickAction = (a) => {
    setAction(a);
    setPin("");
    setErrorMessage(null);
    setStage("enterPin");
  };

  const submitPin = useCallback(
    async (finalPin) => {
      if (!action || submitting) return;
      setSubmitting(true);
      setErrorMessage(null);
      let result;
      try {
        if (action.key === "clockIn") {
          result = await kioskClockInPreview(finalPin);
        } else if (action.key === "clockOut") {
          result = await kioskClockOutPreview(finalPin);
        } else if (action.key === "breakStart") {
          result = await kioskBreakStart(finalPin);
        } else if (action.key === "breakEnd") {
          result = await kioskBreakEnd(finalPin);
        }
      } catch (e) {
        result = { success: false, message: e.message };
      }
      setSubmitting(false);

      if (!result?.success) {
        setErrorMessage(friendlyError(result?.status, result?.message));
        setPin("");
        return;
      }

      // Two-phase clock in/out → confirm screen
      if (action.key === "clockIn" || action.key === "clockOut") {
        setPreview(result.data);
        setStage("confirm");
        return;
      }

      // Single-phase break → straight to success
      const workerName = result.data?.worker?.name || "worker";
      setSuccessMessage(
        action.key === "breakStart"
          ? `Break started for ${workerName}`
          : `Welcome back, ${workerName}`
      );
      setStage("success");
    },
    [action, submitting]
  );

  // Auto-submit on PIN length
  useEffect(() => {
    if (stage === "enterPin" && pin.length === PIN_LENGTH && !submitting) {
      submitPin(pin);
    }
  }, [pin, stage, submitting, submitPin]);

  // Animate success
  useEffect(() => {
    if (stage !== "success") return;
    Animated.parallel([
      Animated.timing(successFade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    autoReturnTimer.current = setTimeout(resetToStart, SUCCESS_HOLD_MS);
    return () => {
      if (autoReturnTimer.current) clearTimeout(autoReturnTimer.current);
    };
  }, [stage, successFade, successScale, resetToStart]);

  // Confirm step (clock in / clock out)
  const handleCommit = useCallback(async () => {
    if (!preview?.actionToken || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    let result;
    try {
      result =
        action.key === "clockIn"
          ? await kioskClockInCommit(preview.actionToken)
          : await kioskClockOutCommit(preview.actionToken);
    } catch (e) {
      result = { success: false, message: e.message };
    }
    setSubmitting(false);
    if (!result?.success) {
      setErrorMessage(friendlyError(result?.status, result?.message));
      return;
    }
    const name = preview?.worker?.name || "worker";
    setSuccessMessage(
      action.key === "clockIn" ? `Clocked in: ${name}` : `Clocked out: ${name}`
    );
    setStage("success");
  }, [preview, action, submitting]);

  // ── Long-press logo to open exit flow ──────────────────────────
  const startLongPress = () => {
    setLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      setLongPressing(false);
      router.push("/(kiosk)/exit");
    }, 5000);
  };
  const cancelLongPress = () => {
    setLongPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ── Renderers ──────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <Pressable
        onPressIn={startLongPress}
        onPressOut={cancelLongPress}
        accessibilityLabel="Logo (long-press to exit kiosk mode)"
        style={styles.logoBox}
      >
        <RosterioMark size={28} color={glassTheme.colors.primary} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Rosterio</Text>
        <Text style={styles.headerSub}>Kiosk</Text>
      </View>
      {longPressing ? (
        <View style={styles.longPressIndicator}>
          <ActivityIndicator size="small" color={glassTheme.colors.text.tertiary} />
        </View>
      ) : (
        <View style={styles.logoBox} />
      )}
    </View>
  );

  const renderPickAction = () => (
    <View style={styles.pickWrap}>
      <Text style={styles.bigPrompt}>What would you like to do?</Text>
      <View style={styles.actionsGrid}>
        {ACTIONS.map((a) => (
          <Pressable
            key={a.key}
            onPress={() => handlePickAction(a)}
            style={({ pressed }) => [
              styles.actionTile,
              { borderColor: `${a.color}55` },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${a.color}1A` }]}>
              <Ionicons name={a.icon} size={32} color={a.color} />
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderEnterPin = () => (
    <View style={styles.pinWrap}>
      <Text style={styles.bigPrompt}>{action?.label}</Text>
      <Text style={styles.subPrompt}>Enter your 4-digit PIN</Text>
      <View style={styles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              pin.length > i && styles.dotFilled,
            ]}
          />
        ))}
      </View>
      {errorMessage && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={glassTheme.colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
      {submitting && <ActivityIndicator color={glassTheme.colors.primary} style={{ marginVertical: 6 }} />}
      <Keypad
        onDigit={(d) => setPin((p) => (p.length < PIN_LENGTH ? p + d : p))}
        onBackspace={() => setPin((p) => p.slice(0, -1))}
        onClear={() => setPin("")}
        disabled={submitting}
      />
      <Pressable style={styles.cancelRow} onPress={resetToStart}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );

  const renderConfirm = () => {
    const w = preview?.worker || {};
    const s = preview?.shift || {};
    const startLabel = s.startTime ? format(new Date(s.startTime), "h:mm a") : "—";
    const endLabel = s.endTime ? format(new Date(s.endTime), "h:mm a") : null;
    const initials = (w.name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    const verb = action?.key === "clockIn" ? "Clock in" : "Clock out";
    return (
      <View style={styles.confirmWrap}>
        <Text style={styles.bigPrompt}>Confirm {verb.toLowerCase()}</Text>
        <View style={styles.workerCard}>
          {w.photoUrl ? (
            <Image source={{ uri: w.photoUrl }} style={styles.workerAvatar} />
          ) : (
            <View style={[styles.workerAvatar, styles.workerAvatarFallback]}>
              <Text style={styles.workerInitials}>{initials || "?"}</Text>
            </View>
          )}
          <Text style={styles.workerName}>{w.name || "Worker"}</Text>
          <Text style={styles.workerMeta}>
            {s.zone?.name ? `${s.zone.name} · ` : ""}
            {startLabel}
            {endLabel ? ` – ${endLabel}` : ""}
          </Text>
        </View>
        {errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={glassTheme.colors.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
        <Pressable
          onPress={handleCommit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.bigButton,
            { backgroundColor: action?.color || glassTheme.colors.primary },
            pressed && !submitting && { opacity: 0.85 },
            submitting && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Confirm ${verb}`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bigButtonText}>Confirm {verb}</Text>
          )}
        </Pressable>
        <Pressable style={styles.cancelRow} onPress={resetToStart}>
          <Text style={styles.cancelText}>Not me — cancel</Text>
        </Pressable>
      </View>
    );
  };

  const renderSuccess = () => (
    <View style={styles.successWrap}>
      <Animated.View
        style={[
          styles.successTickWrap,
          { opacity: successFade, transform: [{ scale: successScale }] },
        ]}
      >
        <Ionicons name="checkmark-circle" size={120} color={glassTheme.colors.success} />
      </Animated.View>
      <Text style={styles.successText}>{successMessage}</Text>
    </View>
  );

  return (
    <KioskShell>
      {renderHeader()}
      <View style={styles.body}>
        {stage === "pickAction" && renderPickAction()}
        {stage === "enterPin" && renderEnterPin()}
        {stage === "confirm" && renderConfirm()}
        {stage === "success" && renderSuccess()}
      </View>
    </KioskShell>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: glassTheme.colors.wash.black,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
    fontWeight: "500",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  longPressIndicator: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bigPrompt: {
    fontSize: 28,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 8,
  },
  subPrompt: {
    fontSize: 16,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    marginBottom: 24,
  },

  // Action picker
  pickWrap: { flex: 1, justifyContent: "center", paddingTop: 12, paddingBottom: 24 },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  },
  actionTile: {
    width: "47%",
    minHeight: 156,
    borderRadius: glassTheme.radius.large,
    backgroundColor: "#fff",
    borderWidth: 2,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    ...glassTheme.shadows.medium,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.2,
  },

  // PIN entry
  pinWrap: { flex: 1, paddingTop: 8, paddingBottom: 12 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 18,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: glassTheme.colors.wash.black,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
  },
  dotFilled: {
    backgroundColor: glassTheme.colors.primary,
    borderColor: glassTheme.colors.primary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: glassTheme.radius.medium,
    backgroundColor: glassTheme.colors.wash.red,
  },
  errorText: {
    fontSize: 13,
    color: glassTheme.colors.danger,
    fontWeight: "500",
  },
  cancelRow: { alignSelf: "center", paddingVertical: 16, paddingHorizontal: 24 },
  cancelText: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500",
  },

  // Confirm
  confirmWrap: { flex: 1, paddingTop: 8, alignItems: "center" },
  workerCard: {
    backgroundColor: "#fff",
    borderRadius: glassTheme.radius.xlarge,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    ...glassTheme.shadows.large,
    marginBottom: 18,
  },
  workerAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 16,
    backgroundColor: glassTheme.colors.wash.black,
  },
  workerAvatarFallback: { alignItems: "center", justifyContent: "center" },
  workerInitials: {
    fontSize: 56,
    fontWeight: "700",
    color: glassTheme.colors.primary,
    letterSpacing: -1,
  },
  workerName: {
    fontSize: 24,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  workerMeta: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
  },
  bigButton: {
    width: "100%",
    maxWidth: 420,
    height: 72,
    borderRadius: glassTheme.radius.large,
    alignItems: "center",
    justifyContent: "center",
    ...glassTheme.shadows.medium,
  },
  bigButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // Success
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  successTickWrap: { marginBottom: 8 },
  successText: {
    fontSize: 22,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});

export default KioskKeypadScreen;
