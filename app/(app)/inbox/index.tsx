/**
 * Inbox screen — in-app notification feed.
 *
 * Polls getMyNotifications() every 30 seconds.
 * Notifications are grouped into "Today" and "Earlier".
 * Invite notifications navigate to the invite detail screen.
 * Non-invite notifications are marked read on tap.
 *
 * Pull-to-refresh triggers an immediate refetch.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { isToday, format, formatDistanceToNow } from "date-fns";
import { getMyNotifications, markNotificationRead } from "../../../src/services/apiHelper";
import glassTheme from "../../../src/theme/glassTheme";
import GlassCard from "../../../src/components/GlassCard";

const POLL_INTERVAL_MS = 30_000;

interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    accountId?: string;
    token?: string;
    deepLink?: string;
  };
}

interface GroupedSection {
  title: string;
  data: AppNotification[];
}

const INVITE_TYPES = new Set(["event_invite_received"]);

function getNotificationIcon(type: string): {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
} {
  if (INVITE_TYPES.has(type)) {
    return { name: "calendar", color: glassTheme.colors.secondary };
  }
  if (type.includes("swap")) {
    return { name: "swap-horizontal", color: glassTheme.colors.info };
  }
  if (type.includes("claim")) {
    return { name: "hand-left", color: glassTheme.colors.warning };
  }
  if (type.includes("shift")) {
    return { name: "briefcase", color: glassTheme.colors.success };
  }
  return { name: "notifications", color: glassTheme.colors.text.secondary };
}

function groupNotifications(items: AppNotification[]): GroupedSection[] {
  const today: AppNotification[] = [];
  const earlier: AppNotification[] = [];
  for (const n of items) {
    if (isToday(new Date(n.createdAt))) {
      today.push(n);
    } else {
      earlier.push(n);
    }
  }
  const sections: GroupedSection[] = [];
  if (today.length > 0) sections.push({ title: "Today", data: today });
  if (earlier.length > 0) sections.push({ title: "Earlier", data: earlier });
  return sections;
}

interface NotificationRowProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}

const NotificationRow = React.memo<NotificationRowProps>(({ item, onPress }) => {
  const icon = getNotificationIcon(item.type);
  const timestamp = new Date(item.createdAt);
  const timeLabel = isToday(timestamp)
    ? formatDistanceToNow(timestamp, { addSuffix: true })
    : format(timestamp, "d MMM");

  return (
    <TouchableOpacity
      style={[styles.row, item.isRead && styles.rowRead]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.isRead ? "Read" : "Unread"}`}
    >
      {/* Icon container */}
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: `${icon.color}18` },
        ]}
      >
        <Ionicons name={icon.name} size={18} color={icon.color} />
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowTime}>{timeLabel}</Text>
        </View>
        <Text style={styles.rowMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
});
NotificationRow.displayName = "NotificationRow";

export default function InboxScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    const result = await getMyNotifications();
    if (result.success && Array.isArray(result.data)) {
      setNotifications(result.data as AppNotification[]);
    } else if (!result.success) {
      setError(result.message || "Could not load notifications.");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Initial load + 30s polling
  useEffect(() => {
    fetchNotifications();
    pollTimerRef.current = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchNotifications]);

  const handlePress = useCallback(async (item: AppNotification) => {
    // Invite notifications — navigate to the invite detail screen
    if (INVITE_TYPES.has(item.type)) {
      const { accountId, token } = item.metadata ?? {};
      if (accountId && token) {
        // Optimistically mark read in local state
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
        await markNotificationRead(item._id).catch(() => {});
        router.push(`/invites/${accountId}/${token}`);
        return;
      }
    }
    // All other notifications — mark read
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
      await markNotificationRead(item._id).catch(() => {});
    }
  }, []);

  const sections = groupNotifications(notifications);

  // Flatten sections for FlatList with section headers as special items
  type ListItem =
    | { _type: "header"; title: string; key: string }
    | ({ _type: "notification" } & AppNotification);

  const flatData: ListItem[] = [];
  for (const section of sections) {
    flatData.push({ _type: "header", title: section.title, key: `header-${section.title}` });
    for (const n of section.data) {
      flatData.push({ _type: "notification", ...n });
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item._type === "header") {
        return (
          <Text style={styles.sectionHeader}>{item.title}</Text>
        );
      }
      const { _type, ...notification } = item;
      return <NotificationRow item={notification as AppNotification} onPress={handlePress} />;
    },
    [handlePress]
  );

  const keyExtractor = useCallback(
    (item: ListItem) =>
      item._type === "header" ? item.key : (item as AppNotification)._id,
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
        {notifications.some((n) => !n.isRead) && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {notifications.filter((n) => !n.isRead).length}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={glassTheme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={36}
            color={glassTheme.colors.text.tertiary}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchNotifications()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : flatData.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="mail-outline"
            size={40}
            color={glassTheme.colors.text.tertiary}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyMessage}>
            Notifications and invites will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={glassTheme.colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: glassTheme.colors.background.screen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: glassTheme.spacing.lg,
    paddingTop: glassTheme.spacing.md,
    paddingBottom: glassTheme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glassTheme.border.color,
    gap: glassTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: glassTheme.typography.fontFamily.bold,
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
  },
  unreadBadge: {
    backgroundColor: glassTheme.colors.secondary,
    borderRadius: glassTheme.radius.pill,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 12,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.inverse,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: glassTheme.spacing.xxl,
  },
  errorText: {
    fontSize: 14,
    fontFamily: glassTheme.typography.fontFamily.regular,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    marginBottom: glassTheme.spacing.lg,
  },
  retryButton: {
    paddingHorizontal: glassTheme.spacing.xl,
    paddingVertical: glassTheme.spacing.md,
    backgroundColor: glassTheme.colors.primary,
    borderRadius: glassTheme.radius.medium,
  },
  retryText: {
    fontSize: 14,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.inverse,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.primary,
    marginBottom: glassTheme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: glassTheme.typography.fontFamily.regular,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: glassTheme.spacing.lg,
    paddingTop: glassTheme.spacing.lg,
    paddingBottom: glassTheme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: glassTheme.spacing.lg,
    paddingVertical: glassTheme.spacing.md,
    gap: glassTheme.spacing.md,
    backgroundColor: glassTheme.colors.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glassTheme.border.color,
  },
  rowRead: {
    backgroundColor: glassTheme.colors.background.tertiary,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: glassTheme.spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.1,
  },
  rowTime: {
    fontSize: 11,
    fontFamily: glassTheme.typography.fontFamily.regular,
    color: glassTheme.colors.text.tertiary,
    flexShrink: 0,
  },
  rowMessage: {
    fontSize: 13,
    fontFamily: glassTheme.typography.fontFamily.regular,
    color: glassTheme.colors.text.secondary,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: glassTheme.colors.secondary,
    marginTop: 6,
    flexShrink: 0,
  },
});
