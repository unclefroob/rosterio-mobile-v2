import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import KioskShell from "./components/KioskShell";
import { useKiosk } from "../../context/KioskContext";
import glassTheme from "../../theme/glassTheme";

/**
 * KioskPairScreen — first-launch QR pairing flow for a kiosk device.
 *
 * QR payload (JSON): { kioskToken, locationId, accountId }
 * The shiftos-manager web side encodes the same shape from its KioskPairing
 * page. We accept both raw JSON and base64-encoded JSON for forward
 * compatibility.
 *
 * On scan success → write @kiosk:* keys via KioskContext.enterKioskMode →
 * the root layout swaps to the (kiosk) tree on next render.
 */
const KioskPairScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const { enterKioskMode } = useKiosk();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const lastScanRef = useRef(0);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const parsePayload = (raw) => {
    if (!raw) return null;
    let text = String(raw).trim();
    // Try direct JSON first
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object") return obj;
    } catch (_) {
      // not JSON — try base64
    }
    try {
      // RN doesn't ship atob globally on some platforms; use Buffer-style fallback
      let decoded;
      if (typeof globalThis.atob === "function") {
        decoded = globalThis.atob(text);
      } else {
        // expo-router env has Buffer in node modules; if not, bail
        const Buf = global.Buffer || require("buffer").Buffer;
        decoded = Buf.from(text, "base64").toString("utf8");
      }
      const obj = JSON.parse(decoded);
      if (obj && typeof obj === "object") return obj;
    } catch (_) {
      // fallthrough
    }
    return null;
  };

  const onBarcodeScanned = useCallback(
    async ({ data }) => {
      if (scanned || busy) return;
      // Cheap debounce — CameraView fires repeatedly per frame
      const now = Date.now();
      if (now - lastScanRef.current < 1000) return;
      lastScanRef.current = now;

      const parsed = parsePayload(data);
      if (!parsed || !parsed.kioskToken || !parsed.locationId || !parsed.accountId) {
        setError("That QR code doesn't look right. Ask your manager to regenerate it.");
        return;
      }
      setError(null);
      setScanned(true);
      setBusy(true);
      try {
        await enterKioskMode({
          token: parsed.kioskToken,
          locationId: parsed.locationId,
          accountId: parsed.accountId,
        });
        // Layout reacts to kioskMode flip and swaps to (kiosk) tree.
        router.replace("/(kiosk)");
      } catch (e) {
        console.warn("[kiosk] pair save failed:", e);
        setError("Couldn't save pairing. Please try again.");
        setScanned(false);
        setBusy(false);
      }
    },
    [scanned, busy, enterKioskMode]
  );

  // ── Permission states ──────────────────────────────────────────
  if (!permission) {
    return (
      <KioskShell>
        <View style={styles.center}>
          <ActivityIndicator color={glassTheme.colors.primary} />
        </View>
      </KioskShell>
    );
  }

  if (!permission.granted) {
    return (
      <KioskShell>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={56} color={glassTheme.colors.text.secondary} />
          <Text style={styles.title}>Camera permission required</Text>
          <Text style={styles.subtitle}>
            Rosterio needs the camera to scan the kiosk pairing QR code.
          </Text>
          {permission.canAskAgain ? (
            <Pressable style={styles.cta} onPress={requestPermission}>
              <Text style={styles.ctaText}>Allow camera</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.cta} onPress={() => Linking.openSettings()}>
              <Text style={styles.ctaText}>Open settings</Text>
            </Pressable>
          )}
          <Pressable style={styles.linkRow} onPress={() => router.back()}>
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>
        </View>
      </KioskShell>
    );
  }

  // ── Camera preview ─────────────────────────────────────────────
  return (
    <KioskShell edges={["top"]}>
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Pair this kiosk</Text>
        <Text style={styles.headerSub}>
          Scan the QR code from the manager dashboard.
        </Text>
      </View>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View pointerEvents="none" style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        {busy && (
          <View style={styles.busyOverlay} pointerEvents="none">
            <ActivityIndicator color="#fff" />
            <Text style={styles.busyText}>Pairing kiosk…</Text>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={glassTheme.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable style={styles.linkRow} onPress={() => router.back()}>
        <Text style={styles.linkText}>Cancel</Text>
      </Pressable>
    </KioskShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  cta: {
    marginTop: 16,
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: glassTheme.radius.medium,
    ...glassTheme.shadows.medium,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  linkRow: {
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  linkText: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500",
  },
  headerWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSub: {
    marginTop: 6,
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
  },
  cameraWrap: {
    marginHorizontal: 24,
    aspectRatio: 1,
    borderRadius: glassTheme.radius.xlarge,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
    ...glassTheme.shadows.large,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#fff",
  },
  cornerTL: { top: 16, left: 16, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  busyText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 24,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: glassTheme.radius.medium,
    backgroundColor: glassTheme.colors.wash.red,
    borderWidth: 1,
    borderColor: `${glassTheme.colors.danger}40`,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: glassTheme.colors.danger,
  },
});

export default KioskPairScreen;
