import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import KioskShell from "./components/KioskShell";
import { useKiosk } from "../../context/KioskContext";
import { API_URL } from "../../config/api";
import glassTheme from "../../theme/glassTheme";

/**
 * KioskExitScreen — manager-auth gate to leave kiosk mode.
 *
 * Flow:
 *   1. Manager enters email + password
 *   2. We hit /api/auth/login with raw axios (no AuthContext mutation)
 *   3. On success, clear all @kiosk:* keys → root layout reverts to AuthGate
 *
 * The login here is purely a possession check — we discard the returned
 * tokens to avoid leaking manager session into a shared device. We DO check
 * the role on the response: only `manager` / `super_admin` accounts are
 * allowed to unpair. (Belt-and-braces: backend should also check, but the
 * device check stops a non-manager from even trying.)
 */
const KioskExitScreen = () => {
  const { exitKioskMode } = useKiosk();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await axios.post(
        `${API_URL}/api/auth/login`,
        { email: email.trim(), password },
        { timeout: 10000 }
      );
      if (!resp.data?.success) {
        setError(resp.data?.message || "Sign-in failed.");
        return;
      }
      const data = resp.data.data || resp.data;
      const role = data?.role || data?.user?.role;
      const accounts = data?.accounts || [];
      const hasManagerRole =
        role === "manager" ||
        role === "super_admin" ||
        accounts.some((a) => a.role === "manager" || a.role === "super_admin");
      if (!hasManagerRole) {
        setError("Only managers can exit kiosk mode.");
        return;
      }
      await exitKioskMode();
      // Root layout will swap to AuthGate; replace to login as a safety net.
      router.replace("/(auth)/login");
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Sign-in failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KioskShell>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backRow}
            accessibilityLabel="Cancel"
          >
            <Ionicons name="chevron-back" size={20} color={glassTheme.colors.text.primary} />
            <Text style={styles.backText}>Back to keypad</Text>
          </Pressable>

          <Text style={styles.title}>Exit kiosk mode</Text>
          <Text style={styles.sub}>
            A manager must sign in to unpair this device.
          </Text>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="manager@example.com"
                placeholderTextColor={glassTheme.colors.text.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!busy}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={glassTheme.colors.text.placeholder}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!busy}
              />
            </View>
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={glassTheme.colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <Pressable
              onPress={handleConfirm}
              disabled={busy}
              style={({ pressed }) => [
                styles.cta,
                pressed && !busy && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Unpair kiosk</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KioskShell>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    color: glassTheme.colors.text.primary,
    fontWeight: "500",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
    marginTop: 16,
  },
  sub: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: glassTheme.radius.xlarge,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    ...glassTheme.shadows.large,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: glassTheme.colors.text.secondary,
    marginBottom: 8,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: glassTheme.radius.medium,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: glassTheme.colors.text.primary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: glassTheme.radius.medium,
    backgroundColor: glassTheme.colors.wash.red,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: glassTheme.colors.danger,
  },
  cta: {
    backgroundColor: glassTheme.colors.danger,
    paddingVertical: 15,
    borderRadius: glassTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
    ...glassTheme.shadows.medium,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});

export default KioskExitScreen;
