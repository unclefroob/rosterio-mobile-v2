import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format, isToday, isTomorrow } from "date-fns";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { getDashboardData } from "../../services/apiHelper";
import glassTheme from "../../theme/glassTheme";
import { formatRole } from "../../utils/roleFormatter";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import { TAB_BAR_CONTENT_HEIGHT } from "../../components/LiquidTabBar";

let BlurView;
try { BlurView = require("expo-blur").BlurView; } catch (e) { BlurView = null; }

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { state } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await getDashboardData();
      if (result.success) {
        setData(result.data);
      } else {
        Alert.alert("Error", result.message || "Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const isManager = state.user?.role === "manager" || state.user?.role === "super_admin";
  const isStaff = state.user?.role === "staff";

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const CardContainer = liquidGlass ? GlassView : (BlurView || View);
  const cardProps = liquidGlass
    ? { glassEffectStyle: "regular" }
    : BlurView
    ? { intensity: 45, tint: "light" }
    : {};

  // ── Stat Card ──────────────────────────────────────────────────
  const StatCard = ({ icon, label, value, color = glassTheme.colors.primary, onPress, highlight = false }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
      style={[styles.statCard, highlight && { borderColor: color, borderWidth: 1.5 }]}
    >
      <CardContainer style={styles.statCardInner} {...cardProps}>
        <View style={styles.specular} pointerEvents="none" />
        <View style={[styles.statIconBox, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </CardContainer>
    </TouchableOpacity>
  );

  // ── Shift Card (manager view) ──────────────────────────────────
  const ShiftCard = ({ shift, onPress }) => {
    const location = shift.locationId?.name || "Unknown Location";
    const startTime = shift.startTime ? format(new Date(shift.startTime), "MMM d, h:mm a") : "TBD";
    const assignedCount = shift.assignedUsers?.length || 0;
    const requiredCount = shift.requiredStaffCount || 0;
    const isFilled = assignedCount >= requiredCount;
    const isPartial = assignedCount > 0 && assignedCount < requiredCount;

    const statusColor = isFilled ? glassTheme.colors.success
      : isPartial ? glassTheme.colors.warning
      : glassTheme.colors.danger;

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={styles.shiftCard}>
        <CardContainer style={styles.shiftCardInner} {...cardProps}>
          <View style={styles.specular} pointerEvents="none" />
          <View style={styles.shiftCardHeader}>
            <View style={styles.shiftCardLeft}>
              <Text style={styles.shiftCardLocation}>{location}</Text>
              <Text style={styles.shiftCardTime}>{startTime}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {assignedCount}/{requiredCount}
              </Text>
            </View>
          </View>
          {shift.assignedUsers?.length > 0 && (
            <View style={styles.shiftCardStaff}>
              <Text style={styles.shiftCardStaffLabel}>Staff: </Text>
              <Text style={styles.shiftCardStaffNames} numberOfLines={1}>
                {shift.assignedUsers
                  .map((u) => (typeof u === "object" ? u.name || u.email : "User"))
                  .join(", ")}
              </Text>
            </View>
          )}
        </CardContainer>
      </TouchableOpacity>
    );
  };

  // ── Loading / error states ─────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={glassTheme.colors.gradients.screen} style={styles.center}>
        <ActivityIndicator size="large" color={glassTheme.colors.primary} />
      </LinearGradient>
    );
  }

  if (!data) {
    return (
      <LinearGradient colors={glassTheme.colors.gradients.screen} style={styles.center}>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <TouchableOpacity onPress={loadData} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const firstName = state.user?.name?.split(" ")[0] || "there";

  // ── Main render ────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.vivid}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header / Greeting ──────────────── */}
          <View style={styles.header}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName}</Text>
            <Text style={styles.roleLabel}>{formatRole(state.user?.role)}</Text>
          </View>

          {/* ── Stats Grid ─────────────────────── */}
          <View style={styles.statsGrid}>
            {isManager && (
              <>
                {data.stats?.shiftsNeedingReviewCount > 0 && (
                  <StatCard
                    icon="alert-circle"
                    label="Needs Review"
                    value={data.stats.shiftsNeedingReviewCount}
                    color={glassTheme.colors.danger}
                    highlight
                    onPress={() => navigation.navigate("MyShifts", { initialTab: "needsReview" })}
                  />
                )}
                <StatCard
                  icon="calendar-outline"
                  label="Unfilled Shifts"
                  value={data.stats?.unfilledShiftsCount || 0}
                  color={glassTheme.colors.warning}
                  onPress={() => navigation.navigate("MyShifts", { initialTab: "upcoming" })}
                />
                <StatCard
                  icon="people-outline"
                  label="Active Staff"
                  value={data.stats?.staffCount || 0}
                  color={glassTheme.colors.primary}
                />
                {data.stats?.pendingSwapRequestsCount > 0 && (
                  <StatCard
                    icon="swap-horizontal"
                    label="Pending Swaps"
                    value={data.stats.pendingSwapRequestsCount}
                    color={glassTheme.colors.info}
                    highlight
                    onPress={() => navigation.navigate("MyShifts", { screen: "MyShiftsList", params: { initialTab: "swapRequests" } })}
                  />
                )}
              </>
            )}

            {isStaff && (
              <>
                <StatCard
                  icon="calendar-outline"
                  label="Upcoming Shifts"
                  value={data.stats?.upcomingShiftsCount || 0}
                  color={glassTheme.colors.primary}
                  onPress={() => navigation.navigate("MyShifts", { initialTab: "upcoming" })}
                />
                {data.stats?.pendingClaimsCount > 0 && (
                  <StatCard
                    icon="hourglass-outline"
                    label="Pending Claims"
                    value={data.stats.pendingClaimsCount}
                    color={glassTheme.colors.warning}
                    highlight
                    onPress={() => navigation.navigate("MyShifts", { initialTab: "pendingClaims" })}
                  />
                )}
                <StatCard
                  icon="time-outline"
                  label="Hours This Week"
                  value={`${data.stats?.hoursWorkedThisWeek || 0}h`}
                  color={glassTheme.colors.success}
                />
                {data.stats?.incomingSwapRequestsCount > 0 && (
                  <StatCard
                    icon="swap-horizontal"
                    label="Swap Requests"
                    value={data.stats.incomingSwapRequestsCount}
                    color={glassTheme.colors.info}
                    highlight
                    onPress={() => navigation.navigate("MyShifts", { screen: "MyShiftsList", params: { initialTab: "swapRequests" } })}
                  />
                )}
              </>
            )}
          </View>

          {/* ── Managed Shifts (Manager) ────────── */}
          {isManager && data.managedShifts?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Shifts I Manage</Text>
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => navigation.navigate("MyShifts", { initialTab: "upcoming" })}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                  <Ionicons name="chevron-forward" size={14} color={glassTheme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              {data.managedShifts.slice(0, 5).map((shift) => (
                <ShiftCard
                  key={shift._id}
                  shift={shift}
                  onPress={() => navigation.navigate("MyShifts", { initialTab: "upcoming", date: shift.startTime })}
                />
              ))}
            </View>
          )}

          {/* ── My Upcoming Shifts (Staff) ─────── */}
          {isStaff && data.myUpcomingShifts?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Upcoming Shifts</Text>
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => navigation.navigate("MyShifts", { initialTab: "upcoming" })}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                  <Ionicons name="chevron-forward" size={14} color={glassTheme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              {data.myUpcomingShifts.slice(0, 3).map((shift) => {
                const startDate = shift.startTime ? new Date(shift.startTime) : null;
                const endDate = shift.endTime ? new Date(shift.endTime) : null;
                const location = shift.locationId?.name || "Unknown Location";

                let dateLabel = startDate ? format(startDate, "MMM d, yyyy") : "TBD";
                if (startDate && isToday(startDate)) dateLabel = "Today";
                else if (startDate && isTomorrow(startDate)) dateLabel = "Tomorrow";

                const timeLabel = startDate && endDate
                  ? `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`
                  : "TBD";

                return (
                  <TouchableOpacity
                    key={shift._id}
                    style={styles.upcomingCard}
                    onPress={() => navigation.navigate("MyShifts", { initialTab: "upcoming" })}
                    activeOpacity={0.72}
                  >
                    <CardContainer style={styles.upcomingCardInner} {...cardProps}>
                      <View style={styles.specular} pointerEvents="none" />
                      <View style={styles.upcomingLeft}>
                        <View style={styles.upcomingIconBox}>
                          <Ionicons name="calendar" size={20} color={glassTheme.colors.primary} />
                        </View>
                        <View style={styles.upcomingInfo}>
                          <Text style={styles.upcomingLocation} numberOfLines={1}>{location}</Text>
                          <Text style={styles.upcomingDate}>{dateLabel}</Text>
                          <Text style={styles.upcomingTime}>{timeLabel}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={glassTheme.colors.text.tertiary} />
                    </CardContainer>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Swap Requests (Staff) ──────────── */}
          {isStaff && data.incomingSwapRequests?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Swap Requests</Text>
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => navigation.navigate("MyShifts", { screen: "MyShiftsList", params: { initialTab: "swapRequests" } })}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                  <Ionicons name="chevron-forward" size={14} color={glassTheme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              {data.incomingSwapRequests.slice(0, 3).map((request) => {
                const requester = request.requesterUserId;
                const shift = request.requesterShiftId;
                return (
                  <TouchableOpacity
                    key={request._id}
                    onPress={() => navigation.navigate("MyShifts", { screen: "MyShiftsList", params: { initialTab: "swapRequests" } })}
                    style={styles.swapCard}
                  >
                    <CardContainer style={styles.swapCardInner} {...cardProps}>
                      <View style={styles.specular} pointerEvents="none" />
                      <View style={styles.swapHeader}>
                        <View style={styles.swapIconBox}>
                          <Ionicons name="person" size={18} color={glassTheme.colors.warning} />
                        </View>
                        <View style={styles.swapInfo}>
                          <Text style={styles.swapName} numberOfLines={1}>
                            {requester?.name || requester?.email || "Unknown User"}
                          </Text>
                          <Text style={styles.swapShift} numberOfLines={1}>
                            {shift?.locationId?.name || "Unknown Location"} •{" "}
                            {shift?.startTime ? format(new Date(shift.startTime), "MMM d, h:mm a") : "TBD"}
                          </Text>
                        </View>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                      </View>
                    </CardContainer>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Pending Swap Approvals (Manager) ── */}
          {isManager && data.pendingSwapRequests?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Swap Approvals</Text>
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => navigation.navigate("MyShifts", { screen: "MyShiftsList", params: { initialTab: "swapRequests" } })}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                  <Ionicons name="chevron-forward" size={14} color={glassTheme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              {data.pendingSwapRequests.slice(0, 3).map((request) => {
                const requester = request.requesterUserId;
                const target = request.targetUserId;
                const requesterShift = request.requesterShiftId;
                const targetShift = request.targetShiftId;
                return (
                  <TouchableOpacity
                    key={request._id}
                    onPress={() => navigation.navigate("MyShifts", { screen: "MyShiftsList", params: { initialTab: "swapRequests" } })}
                    style={styles.swapCard}
                  >
                    <CardContainer style={styles.swapCardInner} {...cardProps}>
                      <View style={styles.specular} pointerEvents="none" />
                      <View style={styles.swapHeader}>
                        <View style={[styles.swapIconBox, { backgroundColor: glassTheme.colors.wash.blue }]}>
                          <Ionicons name="swap-horizontal" size={18} color={glassTheme.colors.info} />
                        </View>
                        <View style={styles.swapInfo}>
                          <Text style={styles.swapName} numberOfLines={1}>
                            {requester?.name || requester?.email} ↔ {target?.name || target?.email}
                          </Text>
                          <Text style={styles.swapShift} numberOfLines={1}>
                            {requesterShift?.locationId?.name || "Unknown"} ↔ {targetShift?.locationId?.name || "No shift"}
                          </Text>
                        </View>
                        <View style={[styles.pendingBadge, { backgroundColor: `${glassTheme.colors.info}18` }]}>
                          <Text style={[styles.pendingBadgeText, { color: glassTheme.colors.info }]}>Review</Text>
                        </View>
                      </View>
                    </CardContainer>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: TAB_BAR_CONTENT_HEIGHT + 48 },

  center: {
    flex: 1,
    backgroundColor: glassTheme.colors.background.screen,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: glassTheme.radius.medium,
  },
  retryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 15,
    fontWeight: "500",
    color: glassTheme.colors.text.secondary,
    letterSpacing: 0.1,
  },
  name: {
    fontSize: 30,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 13,
    color: glassTheme.colors.text.tertiary,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    width: "47%",
    borderRadius: glassTheme.radius.large,
    overflow: "hidden",
  },
  statCardInner: {
    backgroundColor: glassTheme.glass.light.background,
    borderRadius: glassTheme.radius.large,
    padding: 16,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    overflow: "hidden",
    ...glassTheme.shadows.medium,
  },
  specular: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: glassTheme.glass.light.specular,
    zIndex: 1,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.2,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginRight: -8,
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500",
  },

  // Shift cards
  shiftCard: {
    marginBottom: 10,
    borderRadius: glassTheme.radius.large,
    overflow: "hidden",
  },
  shiftCardInner: {
    backgroundColor: glassTheme.glass.light.background,
    borderRadius: glassTheme.radius.large,
    padding: 16,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    overflow: "hidden",
    ...glassTheme.shadows.small,
  },
  shiftCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shiftCardLeft: { flex: 1 },
  shiftCardLocation: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 3,
  },
  shiftCardTime: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: glassTheme.radius.pill,
    marginLeft: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  shiftCardStaff: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: glassTheme.border.color,
  },
  shiftCardStaffLabel: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
  },
  shiftCardStaffNames: {
    fontSize: 12,
    color: glassTheme.colors.text.primary,
    flex: 1,
  },

  // Upcoming shift cards
  upcomingCard: {
    marginBottom: 10,
    borderRadius: glassTheme.radius.large,
    overflow: "hidden",
  },
  upcomingCardInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: glassTheme.glass.light.background,
    borderRadius: glassTheme.radius.large,
    padding: 14,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    overflow: "hidden",
    ...glassTheme.shadows.small,
  },
  upcomingLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  upcomingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: glassTheme.colors.wash.black,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  upcomingInfo: { flex: 1 },
  upcomingLocation: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 2,
  },
  upcomingDate: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    marginBottom: 1,
  },
  upcomingTime: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
  },

  // Swap request cards
  swapCard: {
    marginBottom: 10,
    borderRadius: glassTheme.radius.large,
    overflow: "hidden",
  },
  swapCardInner: {
    backgroundColor: glassTheme.glass.light.background,
    borderRadius: glassTheme.radius.large,
    padding: 14,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    overflow: "hidden",
    ...glassTheme.shadows.small,
  },
  swapHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  swapIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: glassTheme.colors.wash.orange,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  swapInfo: { flex: 1 },
  swapName: {
    fontSize: 14,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 2,
  },
  swapShift: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
  },
  pendingBadge: {
    backgroundColor: `${glassTheme.colors.warning}18`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: glassTheme.radius.pill,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: glassTheme.colors.warning,
  },

  bottomPad: { height: 20 },
});

export default DashboardScreen;
