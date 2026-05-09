import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import glassTheme from "../../../theme/glassTheme";

/**
 * WorkerActionSheet — bottom-sheet modal for the manager zone roster.
 *
 * Mirrors the existing Modal-as-sheet pattern used in MyShiftsScreen rather
 * than introducing a third-party bottom-sheet library. Actions enabled per
 * the worker's state machine: working → start break / clock out; on-break →
 * end break / clock out.
 */
const ACTION_LABELS = {
  startBreak: { label: "Start break", icon: "pause-circle-outline", color: glassTheme.colors.warning },
  endBreak: { label: "End break", icon: "play-circle-outline", color: glassTheme.colors.info },
  clockOut: { label: "Clock out", icon: "log-out-outline", color: glassTheme.colors.danger },
};

const WorkerActionSheet = ({ visible, worker, onClose, onAction }) => {
  const [phase, setPhase] = useState("pick"); // pick | reason
  const [pendingAction, setPendingAction] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setPhase("pick");
      setPendingAction(null);
      setReason("");
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  if (!worker) return null;

  const isOnBreak = worker.status === "on-break";
  const availableActions = isOnBreak
    ? ["endBreak", "clockOut"]
    : ["startBreak", "clockOut"];

  const handlePick = (key) => {
    setPendingAction(key);
    setPhase("reason");
  };

  const handleConfirm = async () => {
    if (!pendingAction || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await onAction(pendingAction, reason.trim() || undefined);
      if (!ok?.success) {
        setError(ok?.message || "Action failed.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onClose();
    } catch (e) {
      setError(e.message || "Action failed.");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{worker.name}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={glassTheme.colors.text.tertiary} />
            </Pressable>
          </View>

          {phase === "pick" && (
            <>
              {availableActions.map((key) => {
                const a = ACTION_LABELS[key];
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [
                      styles.actionRow,
                      pressed && { backgroundColor: glassTheme.colors.wash.black },
                    ]}
                    onPress={() => handlePick(key)}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: `${a.color}1A` }]}>
                      <Ionicons name={a.icon} size={22} color={a.color} />
                    </View>
                    <Text style={styles.actionLabel}>{a.label}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={glassTheme.colors.text.tertiary}
                    />
                  </Pressable>
                );
              })}
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          )}

          {phase === "reason" && (
            <>
              <Text style={styles.reasonPrompt}>
                {ACTION_LABELS[pendingAction]?.label} — add a note (optional)
              </Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="e.g. clocking out: forgot to do it"
                placeholderTextColor={glassTheme.colors.text.placeholder}
                value={reason}
                onChangeText={setReason}
                multiline
                editable={!submitting}
              />
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={glassTheme.colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.secondaryBtn]}
                  onPress={() => setPhase("pick")}
                  disabled={submitting}
                >
                  <Text style={styles.secondaryText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor:
                        ACTION_LABELS[pendingAction]?.color || glassTheme.colors.primary,
                    },
                    submitting && { opacity: 0.6 },
                  ]}
                  onPress={handleConfirm}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>
                      Confirm {ACTION_LABELS[pendingAction]?.label.toLowerCase()}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    ...glassTheme.shadows.xlarge,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: glassTheme.colors.wash.black,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: glassTheme.radius.medium,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: glassTheme.colors.text.primary,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500",
  },

  // Reason phase
  reasonPrompt: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 12,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: glassTheme.radius.medium,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    padding: 12,
    fontSize: 15,
    color: glassTheme.colors.text.primary,
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: glassTheme.radius.medium,
    backgroundColor: glassTheme.colors.wash.red,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: glassTheme.colors.danger },
  buttonRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: glassTheme.radius.medium,
    backgroundColor: glassTheme.colors.wash.black,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 15,
    color: glassTheme.colors.text.primary,
    fontWeight: "500",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: glassTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
    ...glassTheme.shadows.small,
  },
  confirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});

export default WorkerActionSheet;
