import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { formatDistanceToNowStrict } from "date-fns";
import {
  getZoneRoster,
  startBreakOnBehalf,
  endBreakOnBehalf,
  clockOutOnBehalf,
} from "../../services/apiHelper";
import { useAuth } from "../../context/AuthContext";
import glassTheme from "../../theme/glassTheme";
import WorkerActionSheet from "./components/WorkerActionSheet";

/**
 * ZoneRosterScreen — manager-only live attendance.
 *
 * Mirrors the web zone roster: SectionList grouped by zone with sticky
 * headers, tap a worker for the action sheet, pull-to-refresh, 10s polling
 * while the screen is focused.
 *
 * Role gating happens in-screen (matches the in-screen pattern used in
 * MyShiftsScreen). Non-managers get a forbidden card.
 *
 * Location selection: v1 uses the manager's primary location (the first
 * location in `state.user.accessibleLocations` or whatever the dashboard
 * uses; falls back to a route param). A LocationPicker is wired but stubs
 * out to a single-location list until the backend exposes the manager's
 * full location list — flagged in the open-questions section of the brief.
 */
const POLL_INTERVAL_MS = 10000;

const formatRelative = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return `${formatDistanceToNowStrict(d, { addSuffix: false })} ago`;
  } catch (_) {
    return "—";
  }
};

const initialsFor = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const ZoneRosterScreen = () => {
  const { state } = useAuth();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const role = state.user?.role || state.role;
  const isManager = role === "manager" || role === "super_admin";

  const fallbackLocationId = useMemo(() => {
    if (params?.locationId) return String(params.locationId);
    const al = state.user?.accessibleLocations || state.user?.locations || [];
    if (al.length > 0) return al[0].id || al[0]._id;
    return state.user?.locationId || state.user?.primaryLocationId || null;
  }, [params, state.user]);

  const [locationId, setLocationId] = useState(fallbackLocationId);
  const [data, setData] = useState(null); // { zones: [...], unassigned: [...] }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [actionWorker, setActionWorker] = useState(null);
  const sheetOpenRef = useRef(false);

  useEffect(() => {
    if (!locationId && fallbackLocationId) setLocationId(fallbackLocationId);
  }, [fallbackLocationId, locationId]);

  const fetchRoster = useCallback(
    async ({ silent } = {}) => {
      if (!locationId) {
        setLoading(false);
        return;
      }
      try {
        const res = await getZoneRoster(locationId);
        if (res?.success) {
          setData(res.data);
          setError(null);
          setLastUpdated(new Date());
        } else if (!silent) {
          setError(res?.message || "Failed to load roster");
        }
      } catch (e) {
        if (!silent) setError(e.message || "Failed to load roster");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locationId]
  );

  // Initial load + on locationId change
  useEffect(() => {
    setLoading(true);
    fetchRoster();
  }, [fetchRoster]);

  // Focus-gated polling — pause when sheet is open to avoid clobbering UI
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        if (!sheetOpenRef.current) fetchRoster({ silent: true });
      }, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [fetchRoster])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoster();
  };

  const sections = useMemo(() => {
    if (!data) return [];
    const out = [];
    (data.zones || []).forEach((z) => {
      out.push({ title: z.name || "Zone", zoneId: z.id, data: z.workers || [] });
    });
    if (data.unassigned && data.unassigned.length > 0) {
      out.push({ title: "Unassigned", zoneId: null, data: data.unassigned });
    }
    return out;
  }, [data]);

  const totalWorkers = useMemo(
    () => sections.reduce((sum, s) => sum + s.data.length, 0),
    [sections]
  );

  // ── Action handlers ────────────────────────────────────────────
  const handleWorkerAction = useCallback(
    async (key, reason) => {
      const w = actionWorker;
      if (!w) return { success: false, message: "Worker missing" };
      let result;
      if (key === "startBreak" && w.clockEntryId) {
        result = await startBreakOnBehalf(w.clockEntryId, reason);
      } else if (key === "endBreak" && w.clockEntryId) {
        result = await endBreakOnBehalf(w.clockEntryId, reason);
      } else if (key === "clockOut" && w.shiftId) {
        result = await clockOutOnBehalf(w.shiftId, w.userId, reason);
      } else {
        result = { success: false, message: "Action unavailable for this worker." };
      }
      if (result?.success) {
        // Optimistic refresh
        fetchRoster({ silent: true });
      }
      return result;
    },
    [actionWorker, fetchRoster]
  );

  // ── Renderers ──────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>Live Attendance</Text>
        <Text style={styles.subtitle}>
          {totalWorkers} {totalWorkers === 1 ? "worker" : "workers"} clocked in
          {lastUpdated ? ` · updated ${formatRelative(lastUpdated.toISOString())}` : ""}
        </Text>
      </View>
      <Pressable onPress={onRefresh} hitSlop={10} accessibilityLabel="Refresh">
        <Ionicons name="refresh" size={22} color={glassTheme.colors.text.secondary} />
      </Pressable>
    </View>
  );

  const renderItem = ({ item }) => {
    const onBreak = item.status === "on-break";
    return (
      <Pressable
        onPress={() => {
          sheetOpenRef.current = true;
          setActionWorker(item);
        }}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: glassTheme.colors.wash.black },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${onBreak ? "on break" : "working"}`}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initialsFor(item.name) || "?"}</Text>
          </View>
        )}
        <View style={styles.rowMid}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowMeta}>
            Clocked in {formatRelative(item.clockInTime)}
          </Text>
        </View>
        {onBreak && (
          <View style={styles.breakPill}>
            <Ionicons name="pause" size={10} color={glassTheme.colors.warning} />
            <Text style={styles.breakPillText}>On break</Text>
          </View>
        )}
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={glassTheme.colors.text.tertiary}
          style={{ marginLeft: 8 }}
        />
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="people-outline" size={42} color={glassTheme.colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No one clocked in yet</Text>
      <Text style={styles.emptyText}>
        Workers will appear here as they clock in at the kiosk.
      </Text>
    </View>
  );

  // ── Gating ─────────────────────────────────────────────────────
  if (!isManager) {
    return (
      <LinearGradient colors={glassTheme.colors.gradients.screen} style={styles.bg}>
        <SafeAreaView style={styles.center} edges={["top", "bottom"]}>
          <Ionicons name="lock-closed-outline" size={42} color={glassTheme.colors.text.tertiary} />
          <Text style={styles.gateTitle}>Manager-only screen</Text>
          <Text style={styles.gateText}>
            Live attendance is only visible to managers and super-admins.
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!locationId) {
    return (
      <LinearGradient colors={glassTheme.colors.gradients.screen} style={styles.bg}>
        <SafeAreaView style={styles.center} edges={["top", "bottom"]}>
          <Ionicons name="location-outline" size={42} color={glassTheme.colors.text.tertiary} />
          <Text style={styles.gateTitle}>No location available</Text>
          <Text style={styles.gateText}>
            We couldn't determine which location to show. Open a shift's location first.
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={glassTheme.colors.gradients.screen} style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {renderHeader()}
        {loading && !data ? (
          <View style={styles.center}>
            <ActivityIndicator color={glassTheme.colors.primary} />
          </View>
        ) : error && !data ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={42} color={glassTheme.colors.text.tertiary} />
            <Text style={styles.gateTitle}>Couldn't load roster</Text>
            <Text style={styles.gateText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchRoster()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : sections.length === 0 ? (
          renderEmpty()
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, idx) => `${item.userId || idx}`}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}
        <WorkerActionSheet
          visible={!!actionWorker}
          worker={actionWorker}
          onClose={() => {
            sheetOpenRef.current = false;
            setActionWorker(null);
          }}
          onAction={handleWorkerAction}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  titleWrap: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: glassTheme.colors.background.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.1,
  },
  sectionCount: {
    fontSize: 13,
    color: glassTheme.colors.text.tertiary,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: glassTheme.radius.large,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    ...glassTheme.shadows.small,
  },
  sep: { height: 8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: glassTheme.colors.wash.black,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: glassTheme.colors.primary,
    letterSpacing: -0.3,
  },
  rowMid: { flex: 1 },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    marginTop: 2,
  },
  breakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: glassTheme.radius.pill,
    backgroundColor: glassTheme.colors.wash.orange,
    borderWidth: 1,
    borderColor: `${glassTheme.colors.warning}55`,
  },
  breakPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: glassTheme.colors.warning,
  },

  // Empty / gate states
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    maxWidth: 320,
  },
  gateTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginTop: 8,
  },
  gateText: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    maxWidth: 320,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: glassTheme.radius.medium,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

export default ZoneRosterScreen;
