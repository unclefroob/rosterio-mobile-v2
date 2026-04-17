import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../services/apiClient";
import { toast } from "../../components/Toast";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import glassTheme from "../../theme/glassTheme";

let BlurView;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

const MyClaimsScreen = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClaims = useCallback(async () => {
    try {
      const response = await apiClient.get("/api/marketplace/my-claims");
      if (response.data.success) {
        setClaims(response.data.data?.claims || []);
      }
    } catch (error) {
      console.error("Error loading claims:", error);
      toast.error("Failed to load your claims. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadClaims();
    }, [loadClaims])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadClaims();
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "approved":
        return {
          bg: `${glassTheme.colors.success}22`,
          text: glassTheme.colors.success,
          icon: "checkmark-circle",
          label: "Approved",
        };
      case "rejected":
        return {
          bg: `${glassTheme.colors.danger}20`,
          text: glassTheme.colors.danger,
          icon: "close-circle",
          label: "Rejected",
        };
      case "pending":
        return {
          bg: `${glassTheme.colors.warning}22`,
          text: glassTheme.colors.warning,
          icon: "hourglass",
          label: "Pending",
        };
      case "cancelled":
        return {
          bg: "rgba(0,0,0,0.06)",
          text: glassTheme.colors.text.secondary,
          icon: "close-circle-outline",
          label: "Cancelled",
        };
      default:
        return {
          bg: "rgba(0,0,0,0.06)",
          text: glassTheme.colors.text.primary,
          icon: "help-circle",
          label: "Unknown",
        };
    }
  };

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const CardContainer = liquidGlass ? GlassView : Platform.OS === "ios" && BlurView ? BlurView : View;
  const cardProps = liquidGlass
    ? { glassEffectStyle: "regular" }
    : Platform.OS === "ios" && BlurView
    ? { intensity: 20, tint: "light" }
    : {};

  const renderClaimCard = ({ item }) => {
    const { shift, claims: userClaims } = item;
    const latestClaim = userClaims?.[0];
    const startDate = shift.startTime ? new Date(shift.startTime) : null;
    const endDate = shift.endTime ? new Date(shift.endTime) : null;
    const durationHours =
      startDate && endDate ? (endDate - startDate) / (1000 * 60 * 60) : 0;
    const isPast = endDate ? new Date() > endDate : false;

    const statusConfig = getStatusConfig(latestClaim?.status);

    let dateDisplay = startDate ? format(startDate, "MMM d, yyyy") : "TBD";
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (startDate && startDate.toDateString() === today.toDateString()) {
      dateDisplay = "Today";
    } else if (startDate && startDate.toDateString() === tomorrow.toDateString()) {
      dateDisplay = "Tomorrow";
    }

    return (
      <CardContainer style={styles.claimCard} {...cardProps}>
        {/* Header row: date + status badge */}
        <View style={styles.claimHeader}>
          <View style={styles.claimDateBlock}>
            <Text style={styles.claimDate}>{dateDisplay}</Text>
            <Text style={styles.claimTime}>
              {startDate ? format(startDate, "h:mm a") : "?"} –{" "}
              {endDate ? format(endDate, "h:mm a") : "?"}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.bg },
            ]}
          >
            <Ionicons
              name={statusConfig.icon}
              size={13}
              color={statusConfig.text}
            />
            <Text
              style={[styles.statusBadgeText, { color: statusConfig.text }]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.claimDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={glassTheme.colors.text.secondary}
            />
            <Text style={styles.detailText}>
              {shift.location?.name ||
                shift.locationId?.name ||
                "Location TBD"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="time-outline"
              size={14}
              color={glassTheme.colors.text.secondary}
            />
            <Text style={styles.detailText}>
              {durationHours.toFixed(1)} hours
            </Text>
          </View>
          {latestClaim?.message ? (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{latestClaim.message}</Text>
            </View>
          ) : null}
        </View>

        {/* Completed banner for approved past shifts */}
        {isPast && latestClaim?.status === "approved" ? (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-done" size={15} color={glassTheme.colors.success} />
            <Text style={styles.completedText}>Shift Completed</Text>
          </View>
        ) : null}
      </CardContainer>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={52} color={glassTheme.colors.text.tertiary} />
      <Text style={styles.emptyStateText}>No claims yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Head to the Marketplace to claim your first shift
      </Text>
    </View>
  );

  const approvedCount = claims.filter(
    (c) => c.claims?.[0]?.status === "approved"
  ).length;
  const pendingCount = claims.filter(
    (c) => c.claims?.[0]?.status === "pending"
  ).length;
  const rejectedCount = claims.filter(
    (c) => c.claims?.[0]?.status === "rejected"
  ).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={glassTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={claims}
        renderItem={renderClaimCard}
        keyExtractor={(item, index) => item.shiftId || String(index)}
        contentContainerStyle={[
          styles.listContent,
          claims.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={glassTheme.colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          claims.length > 0 ? (
            <View style={styles.summary}>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: glassTheme.colors.success }]}>
                  {approvedCount}
                </Text>
                <Text style={styles.summaryLabel}>Approved</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: glassTheme.colors.warning }]}>
                  {pendingCount}
                </Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: glassTheme.colors.danger }]}>
                  {rejectedCount}
                </Text>
                <Text style={styles.summaryLabel}>Rejected</Text>
              </View>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: glassTheme.colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  summary: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: glassTheme.radius.medium,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    shadowColor: glassTheme.shadow.color,
    shadowOffset: glassTheme.shadow.offset,
    shadowOpacity: glassTheme.shadow.opacity,
    shadowRadius: glassTheme.shadow.radius,
    elevation: glassTheme.shadow.elevation,
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    marginTop: 4,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flex: 1,
  },
  claimCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: glassTheme.radius.large,
    padding: 16,
    marginBottom: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    shadowColor: glassTheme.shadow.color,
    shadowOffset: glassTheme.shadow.offset,
    shadowOpacity: glassTheme.shadow.opacity,
    shadowRadius: glassTheme.shadow.radius,
    elevation: glassTheme.shadow.elevation,
  },
  claimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  claimDateBlock: {
    flex: 1,
    marginRight: 12,
  },
  claimDate: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
  },
  claimTime: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  claimDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
  },
  messageContainer: {
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: glassTheme.colors.primary,
    borderRadius: 4,
    marginTop: 4,
  },
  messageText: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    fontStyle: "italic",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${glassTheme.colors.success}22`,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: glassTheme.radius.small,
    marginTop: 10,
    borderWidth: 1,
    borderColor: `${glassTheme.colors.success}55`,
  },
  completedText: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.success,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: "600",
    color: glassTheme.colors.text.secondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: glassTheme.colors.text.tertiary,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default MyClaimsScreen;
