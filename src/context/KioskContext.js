import React, { useEffect, useState, useCallback, useContext, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * KioskContext — owns the boot-time kiosk-mode flag.
 *
 * The root layout reads `kioskMode` to decide which subtree to mount: the
 * kiosk PIN keypad or the normal Auth + Tabs tree. The context hydrates from
 * AsyncStorage once on launch, before any other render.
 *
 * AsyncStorage keys (also documented in src/services/kioskApiClient.js):
 *   @kiosk:mode        'true' | null
 *   @kiosk:token       string
 *   @kiosk:locationId  string
 *   @kiosk:accountId   string
 *   @kiosk:pairedAt    ISO string
 */

const KIOSK_KEYS = [
  "@kiosk:mode",
  "@kiosk:token",
  "@kiosk:locationId",
  "@kiosk:accountId",
  "@kiosk:pairedAt",
];

const KioskContext = React.createContext(null);

export function KioskContextProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [kioskToken, setKioskToken] = useState(null);
  const [locationId, setLocationId] = useState(null);
  const [accountId, setAccountId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          "@kiosk:mode",
          "@kiosk:token",
          "@kiosk:locationId",
          "@kiosk:accountId",
        ]);
        if (cancelled) return;
        const map = Object.fromEntries(entries);
        setKioskMode(map["@kiosk:mode"] === "true");
        setKioskToken(map["@kiosk:token"] || null);
        setLocationId(map["@kiosk:locationId"] || null);
        setAccountId(map["@kiosk:accountId"] || null);
      } catch (err) {
        console.warn("[kiosk] hydration failed:", err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enterKioskMode = useCallback(async ({ token, locationId: locId, accountId: acctId }) => {
    const pairedAt = new Date().toISOString();
    await AsyncStorage.multiSet([
      ["@kiosk:mode", "true"],
      ["@kiosk:token", token],
      ["@kiosk:locationId", locId],
      ["@kiosk:accountId", acctId],
      ["@kiosk:pairedAt", pairedAt],
    ]);
    setKioskMode(true);
    setKioskToken(token);
    setLocationId(locId);
    setAccountId(acctId);
  }, []);

  const exitKioskMode = useCallback(async () => {
    await AsyncStorage.multiRemove(KIOSK_KEYS);
    setKioskMode(false);
    setKioskToken(null);
    setLocationId(null);
    setAccountId(null);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      kioskMode,
      kioskToken,
      locationId,
      accountId,
      enterKioskMode,
      exitKioskMode,
    }),
    [hydrated, kioskMode, kioskToken, locationId, accountId, enterKioskMode, exitKioskMode]
  );

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export const useKiosk = () => {
  const ctx = useContext(KioskContext);
  if (!ctx) {
    throw new Error("useKiosk must be used within KioskContextProvider");
  }
  return ctx;
};
