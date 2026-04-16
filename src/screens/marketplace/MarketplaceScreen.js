import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format, isToday, isTomorrow, differenceInHours } from "date-fns";
import apiClient from "../../services/apiClient";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import glassTheme from "../../theme/glassTheme";
import { TAB_BAR_CONTENT_HEIGHT } from "../../components/LiquidTabBar";
import { usePlan } from "../../context/PlanContext";
import { formatCurrency } from "../../utils/formatCurrency";

let BlurView;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

const MarketplaceScreen = ({ navigation }) => {
  const { hasMarketplace, plan, loading: planLoading } = usePlan();
  const [shifts, setShifts] = useState([]);
  const [personalizedData, setPersonalizedData] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadShifts = useCallback(async () => {
    try {
      const response = await apiClient.get(
        "/api/marketplace/shifts/personalized",
        {
        params: { limit: 50 },
        }
      );
      if (response.data.success && response.data.data?.shifts) {
        // Store both shifts and personalized data
        const shiftsData = [];
        const personalizedMap = new Map();

        response.data.data.shifts.forEach((item) => {
          shiftsData.push(item.shift);
          personalizedMap.set(item.shift._id.toString(), item.personalized);
        });

        setShifts(shiftsData);
        setPersonalizedData(personalizedMap);
      }
    } catch (error) {
      console.error("Error loading shifts:", error);
      Alert.alert("Error", "Failed to load shifts. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hasMarketplace) {
      loadShifts();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMarketplace]);

  const onRefresh = () => {
    setRefreshing(true);
    loadShifts();
  };

  const handleShiftPress = (shift) => {
    const personalized = personalizedData.get(shift._id.toString());
    navigation.navigate("ShiftDetails", {
      shift,
      personalized,
    });
  };

  // Helper function to extract valid constraints
  const getValidConstraints = (constraints) => {
    if (!constraints || constraints.length === 0) return [];

    const valid = constraints
      .map((constraint) => {
        // Handle populated constraint object
        if (
          constraint.constraintId &&
          typeof constraint.constraintId === "object"
        ) {
          const name =
            constraint.constraintId.name ||
            constraint.constraintId.description ||
            constraint.constraintId.type;
          if (name) {
            return {
              name,
              quantity: constraint.quantity || 1,
            };
          }
        }
        // Handle constraintId as string (ObjectId) - skip unpopulated refs
        if (typeof constraint.constraintId === "string") {
          if (constraint.constraintId.length === 24) {
            return null;
          }
        }
        // Fallback: if constraint has a name/description directly
        if (constraint.name || constraint.description) {
          return {
            name: constraint.name || constraint.description,
            quantity: constraint.quantity || 1,
          };
        }
        return null;
      })
      .filter(Boolean);

    return valid;
  };

  const filteredShifts = shifts.filter(
    (shift) =>
      shift.location?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shift.startTime &&
        format(new Date(shift.startTime), "PPP").includes(searchQuery))
  );

  const renderShiftCard = ({ item }) => {
    const startDate = new Date(item.startTime);
    const endDate = new Date(item.endTime);
    const duration = (endDate - startDate) / (1000 * 60 * 60); // hours
    const isFullyAssigned =
      item.assignedUsers?.length >= item.requiredStaffCount;
    const personalized = personalizedData.get(item._id.toString());
    const claimStatus = personalized?.claimStatus;
    
    // Calculate time until shift starts
    const hoursUntilStart = differenceInHours(startDate, new Date());
    const isStartingSoon = hoursUntilStart > 0 && hoursUntilStart <= 24;
    const isUrgent = hoursUntilStart > 0 && hoursUntilStart <= 6;
    
    // Format date with relative indicator
    let dateDisplay = format(startDate, "MMM d, yyyy");
    if (isToday(startDate)) {
      dateDisplay = "Today";
    } else if (isTomorrow(startDate)) {
      dateDisplay = "Tomorrow";
    }

    const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
    const CardContainer = liquidGlass ? GlassView : Platform.OS === "ios" && BlurView ? BlurView : View;
    const cardProps = liquidGlass
      ? { glassEffectStyle: "regular" }
      : Platform.OS === "ios" && BlurView
      ? { intensity: 20, tint: "light" }
      : {};

    return (
      <TouchableOpacity
        onPress={() => handleShiftPress(item)}
        activeOpacity={0.7}
        style={styles.cardTouchable}
      >
        <CardContainer
          style={[
            styles.shiftCard,
            claimStatus === "approved" && styles.shiftCardClaimed,
            claimStatus === "pending" && styles.shiftCardPending,
            isUrgent && !claimStatus && styles.shiftCardUrgent,
          ]}
          {...cardProps}
      >
        <View style={styles.shiftHeader}>
          <View style={styles.shiftHeaderLeft}>
            <View style={styles.dateContainer}>
              <Text style={styles.shiftDate}>{dateDisplay}</Text>
              {isStartingSoon && !claimStatus && (
                <View style={[styles.urgencyBadge, isUrgent && styles.urgencyBadgeUrgent]}>
                  <Ionicons 
                    name={isUrgent ? "flash" : "time"} 
                    size={10} 
                    color="#fff" 
                  />
                  <Text style={styles.urgencyBadgeText}>
                    {isUrgent ? "Urgent" : hoursUntilStart <= 12 ? `${hoursUntilStart}h` : "Soon"}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.shiftTime}>
              {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isFullyAssigned && (
              <View style={styles.filledBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#166534" />
                <Text style={styles.filledBadgeText}>Filled</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.shiftDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="location" size={18} color={glassTheme.colors.primary} />
            </View>
            <Text style={styles.detailText}>
              {item.locationId?.name || item.location?.name || "Location TBD"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="people" size={18} color={glassTheme.colors.primary} />
            </View>
            <View style={styles.staffingContainer}>
              <Text style={styles.detailText}>
                {item.assignedUsers?.length || 0}/{item.requiredStaffCount} staff
              </Text>
              <View style={styles.staffingBar}>
                <View 
                  style={[
                    styles.staffingBarFill, 
                    { width: `${((item.assignedUsers?.length || 0) / item.requiredStaffCount) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="time-outline" size={18} color={glassTheme.colors.primary} />
            </View>
            <Text style={styles.detailText}>{duration.toFixed(1)} hours</Text>
          </View>
          {item.costEstimate?.totalCost && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={18}
                  color={glassTheme.colors.primary}
                />
              </View>
              <Text style={[styles.detailText, styles.costText]}>
                {formatCurrency(item.costEstimate.totalCost)} est. pay
              </Text>
            </View>
          )}
        </View>

        {(() => {
          const validConstraints = getValidConstraints(item.constraints);
          if (validConstraints.length === 0) {
            return null;
          }

          return (
            <View style={styles.constraints}>
              <View style={styles.constraintsHeader}>
                <Ionicons name="shield-checkmark" size={14} color={glassTheme.colors.warning} />
                <Text style={styles.constraintLabel}>Requirements</Text>
              </View>
              <View style={styles.constraintsList}>
                {validConstraints.slice(0, 2).map((constraint, idx) => (
                  <View key={idx} style={styles.constraintTag}>
                    <Text style={styles.constraintText}>
                      {constraint.name}
                      {constraint.quantity > 1 ? ` (${constraint.quantity})` : ""}
                    </Text>
                  </View>
                ))}
                {validConstraints.length > 2 && (
                  <View style={styles.constraintTag}>
                    <Text style={styles.constraintText}>
                      +{validConstraints.length - 2} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

          {(() => {
            if (claimStatus === "approved") {
              return (
                <View style={styles.claimStatusContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.claimStatusText}>Claim Approved</Text>
                </View>
              );
            } else if (claimStatus === "pending") {
              return (
                <View style={styles.claimStatusContainer}>
                  <Ionicons name="time" size={16} color="#f59e0b" />
                  <Text style={styles.claimStatusText}>Claim Pending</Text>
                </View>
              );
            } else if (claimStatus === "rejected") {
              return (
                <View style={styles.claimStatusContainer}>
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                  <Text style={styles.claimStatusText}>Claim Rejected</Text>
                </View>
              );
            }

            return (
        <TouchableOpacity
                style={[
                  styles.claimButton,
                  isFullyAssigned && styles.claimButtonDisabled,
                  isUrgent && !isFullyAssigned && styles.claimButtonUrgent,
                ]}
          disabled={isFullyAssigned}
                onPress={() => handleShiftPress(item)}
        >
          <Ionicons 
            name={isFullyAssigned ? "checkmark-circle" : "add-circle"} 
            size={18} 
            color="white" 
          />
          <Text style={styles.claimButtonText}>
            {isFullyAssigned ? "Fully Assigned" : "Claim Shift"}
          </Text>
        </TouchableOpacity>
            );
          })()}
        </CardContainer>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="storefront-outline"
        size={48}
        color="#d1d5db"
      />
      <Text style={styles.emptyStateText}>No shifts available</Text>
      <Text style={styles.emptyStateSubtext}>
        Check back later for new opportunities
      </Text>
    </View>
  );

  if (planLoading || loading) {
    return (
      <LinearGradient colors={glassTheme.colors.gradients.screen} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={glassTheme.colors.primary} />
      </LinearGradient>
    );
  }

  if (!hasMarketplace) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons
            name="storefront-outline"
            size={64}
            color={glassTheme.colors.text.secondary}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.emptyStateText, { fontSize: 20, fontWeight: "600", marginBottom: 8 }]}>
            Marketplace Not Available
          </Text>
          <Text style={[styles.emptyStateSubtext, { textAlign: "center", paddingHorizontal: 32 }]}>
            The Shift Marketplace is only available on Pro plans. Upgrade to Pro to access this feature.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const liquidGlassSearch = Platform.OS === "ios" && isLiquidGlassAvailable();
  const SearchContainer = liquidGlassSearch ? GlassView : Platform.OS === "ios" && BlurView ? BlurView : View;
  const searchContainerProps = liquidGlassSearch
    ? { glassEffectStyle: "regular" }
    : Platform.OS === "ios" && BlurView
    ? { intensity: 20, tint: "light" }
    : {};

  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.screen}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header row: title + My Claims button */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity
          style={styles.myClaimsButton}
          onPress={() => navigation.navigate("MyClaims")}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt-outline" size={16} color={glassTheme.colors.primary} />
          <Text style={styles.myClaimsButtonText}>My Claims</Text>
        </TouchableOpacity>
      </View>

      <SearchContainer style={styles.searchContainer} {...searchContainerProps}>
        <Ionicons
          name="search"
          size={20}
          color={glassTheme.colors.text.secondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by location or date..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={glassTheme.colors.text.tertiary}
        />
        {searchQuery && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={{ padding: 6 }}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={glassTheme.colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </SearchContainer>

      <FlatList
        data={filteredShifts}
        renderItem={renderShiftCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
  },
  myClaimsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    borderRadius: 20,
    backgroundColor: `${glassTheme.colors.primary}15`,
    borderWidth: 1,
    borderColor: `${glassTheme.colors.primary}30`,
  },
  myClaimsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: glassTheme.colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: glassTheme.glass.light.backgroundStrong,
    marginHorizontal: 16,
    marginVertical: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: glassTheme.radius.large,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    ...glassTheme.shadows.small,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: glassTheme.colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_CONTENT_HEIGHT + 48,
  },
  cardTouchable: {
    marginBottom: 16,
  },
  shiftCard: {
    backgroundColor: glassTheme.glass.light.backgroundStrong,
    borderRadius: glassTheme.radius.large,
    padding: 20,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    overflow: "hidden",
    ...glassTheme.shadows.medium,
  },
  shiftCardUrgent: {
    borderColor: glassTheme.colors.warning,
    borderWidth: 1.5,
    backgroundColor: `${glassTheme.colors.warning}08`,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  shiftHeaderLeft: {
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  shiftDate: {
    fontSize: 18,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  shiftTime: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: glassTheme.colors.info,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgencyBadgeUrgent: {
    backgroundColor: glassTheme.colors.danger,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  filledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${glassTheme.colors.success}18`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  filledBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.success,
  },
  shiftDetails: {
    marginBottom: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${glassTheme.colors.primary}10`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailText: {
    fontSize: 14,
    color: glassTheme.colors.text.primary,
    fontWeight: "500",
    flex: 1,
  },
  costText: {
    fontWeight: "600",
    color: glassTheme.colors.primary,
  },
  staffingContainer: {
    flex: 1,
  },
  staffingBar: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  staffingBarFill: {
    height: "100%",
    backgroundColor: glassTheme.colors.primary,
    borderRadius: 2,
  },
  constraints: {
    backgroundColor: `${glassTheme.colors.warning}12`,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${glassTheme.colors.warning}30`,
  },
  constraintsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  constraintLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: glassTheme.colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  constraintsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  constraintTag: {
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${glassTheme.colors.warning}30`,
  },
  constraintText: {
    fontSize: 11,
    color: glassTheme.colors.warning,
    fontWeight: "600",
  },
  claimButton: {
    backgroundColor: glassTheme.colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 44,
    borderRadius: 12,
    shadowColor: glassTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonUrgent: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  claimButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.10)",
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  claimButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  shiftCardClaimed: {
    borderColor: glassTheme.colors.success,
    borderWidth: 1.5,
    backgroundColor: `${glassTheme.colors.success}08`,
  },
  shiftCardPending: {
    borderColor: glassTheme.colors.warning,
    borderWidth: 1.5,
    backgroundColor: `${glassTheme.colors.warning}08`,
  },
  claimStatusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  claimStatusText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    color: glassTheme.colors.text.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: glassTheme.colors.text.secondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
    marginTop: 4,
  },
});

export default MarketplaceScreen;
