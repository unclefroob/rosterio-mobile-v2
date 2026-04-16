import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { format, isPast } from "date-fns";
import apiClient from "../../services/apiClient";
import { toast } from "../../components/Toast";
import { formatRole } from "../../utils/roleFormatter";
import { formatCurrency } from "../../utils/formatCurrency";
import { useAuth } from "../../context/AuthContext";
import { requestShiftSwap, searchStaff } from "../../services/apiHelper";
import glassTheme from "../../theme/glassTheme";

const ShiftDetailsScreen = ({ route, navigation }) => {
  const { shift: initialShift, fromMyShifts } = route.params;
  const { state } = useAuth();
  const [shift, setShift] = useState(initialShift);
  const [personalized, setPersonalized] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(false);

  // Swap modal state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserName, setTargetUserName] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [submittingSwap, setSubmittingSwap] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Check if we have claim status from navigation params
  useEffect(() => {
    if (route.params?.personalized) {
      setPersonalized(route.params.personalized);
    }
  }, [route.params]);

  // Fetch shift details with populated constraints if needed
  useEffect(() => {
    const fetchShiftDetails = async () => {
      // Check if constraints are not populated (constraintId is just a string ObjectId)
      const hasUnpopulatedConstraints = initialShift.constraints?.some(
        (c) =>
          typeof c.constraintId === "string" && c.constraintId.length === 24
      );

      if (hasUnpopulatedConstraints) {
        setLoading(true);
        try {
          // Fetch personalized marketplace shifts and find the one we need
          const response = await apiClient.get(
            `/api/marketplace/shifts/personalized`,
            {
              params: { limit: 100 }, // Get enough to find our shift
            }
          );

          if (response.data.success && response.data.data?.shifts) {
            const fetchedItem = response.data.data.shifts.find((item) => {
              const s = item.shift;
              return (
                s._id === initialShift._id ||
                String(s._id) === String(initialShift._id)
              );
            });
            if (fetchedItem) {
              const fetchedShift = fetchedItem.shift;
              const personalizedData = fetchedItem.personalized;
              // Check if constraints are now populated
              const hasPopulatedConstraints = fetchedShift.constraints?.some(
                (c) =>
                  c.constraintId &&
                  typeof c.constraintId === "object" &&
                  c.constraintId.name
              );
              if (hasPopulatedConstraints || !hasUnpopulatedConstraints) {
                setShift(fetchedShift);
                setPersonalized(personalizedData);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching shift details:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchShiftDetails();
  }, [initialShift._id]);

  const startDate = new Date(shift.startTime);
  const endDate = new Date(shift.endTime);
  const duration = (endDate - startDate) / (1000 * 60 * 60);
  const isFullyAssigned =
    shift.assignedUsers?.length >= shift.requiredStaffCount;
  const isPastShift = endDate && isPast(endDate);

  const handleClaimShift = async () => {
    setClaiming(true);
    try {
      const response = await apiClient.post(
        `/api/marketplace/shifts/${shift._id}/claim`,
        {}
      );

      if (response.data.success) {
        // Reload shift data to get updated claim status
        try {
          const refreshResponse = await apiClient.get(
            "/api/marketplace/shifts/personalized",
            {
              params: { limit: 100 },
            }
          );
          if (refreshResponse.data.success) {
            const updatedItem = refreshResponse.data.data.shifts.find(
              (item) => String(item.shift._id) === String(shift._id)
            );
            if (updatedItem) {
              setShift(updatedItem.shift);
              setPersonalized(updatedItem.personalized);
            }
          }
        } catch (refreshError) {
          console.error("Error refreshing shift:", refreshError);
        }

        toast.success(response.data.message);
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to claim shift"
      );
    } finally {
      setClaiming(false);
    }
  };

  // User search for swap
  const searchUsersForSwap = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) {
        setUserSearchResults([]);
        setShowUserDropdown(false);
        return;
      }

      setSearchingUsers(true);
      try {
        const result = await searchStaff({ q: query });
        if (result.success) {
          const filtered = (result.data.staff || []).filter(
            (user) => user._id !== state.user?._id && user._id !== targetUserId
          );
          setUserSearchResults(filtered);
          setShowUserDropdown(filtered.length > 0);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setSearchingUsers(false);
      }
    },
    [state.user, targetUserId]
  );

  const loadUserSuggestions = useCallback(async () => {
    try {
      const result = await searchStaff({ limit: 8 });
      if (result.success) {
        const filtered = (result.data.staff || []).filter(
          (user) => user._id !== state.user?._id
        );
        setUserSuggestions(filtered);
        setShowUserDropdown(filtered.length > 0);
      }
    } catch (error) {
      console.error("Error loading user suggestions:", error);
    }
  }, [state.user]);

  // Handle request swap
  const handleRequestSwap = async () => {
    if (!targetUserId) {
      Alert.alert("Error", "Please select a user to swap with");
      return;
    }

    try {
      setSubmittingSwap(true);
      const result = await requestShiftSwap(
        shift._id,
        targetUserId,
        swapMessage
      );

      if (result.success) {
        setShowSwapModal(false);
        setTargetUserId("");
        setTargetUserName("");
        setSwapMessage("");
        setUserSearchQuery("");
        toast.success("Swap request sent successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Error", result.message || "Failed to send swap request");
      }
    } catch (error) {
      console.error("Error requesting swap:", error);
      Alert.alert("Error", "Error requesting swap");
    } finally {
      setSubmittingSwap(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={glassTheme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView style={styles.container}>
        {/* Header Info */}
        <View style={styles.header}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.date}>{format(startDate, "EEEE, MMMM d")}</Text>
            <Text style={styles.time}>
              {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
            </Text>
          </View>
          {isFullyAssigned && (
            <View style={styles.filledBadge}>
              <Ionicons name="checkmark-circle" size={20} color={glassTheme.colors.success} />
              <Text style={styles.filledBadgeText}>Fully Assigned</Text>
            </View>
          )}
        </View>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color={glassTheme.colors.primary} />
            <Text style={styles.cardTitle}>Location</Text>
          </View>
          <Text style={styles.cardValue}>
            {shift.locationId?.name || shift.location?.name || "Location TBD"}
          </Text>
          {(shift.locationId?.address || shift.location?.address) && (
            <Text style={styles.cardSubtext}>
              {shift.locationId?.address || shift.location?.address}
            </Text>
          )}
        </View>

        {/* Duration & Pay Card */}
        <View style={styles.card}>
          <View style={styles.twoColumnLayout}>
            <View style={styles.column}>
              <View style={styles.cardHeader}>
                <Ionicons name="time" size={20} color={glassTheme.colors.primary} />
                <Text style={styles.cardTitle}>Duration</Text>
              </View>
              <Text style={styles.cardValue}>{duration} hours</Text>
            </View>
            {shift.costEstimate?.totalCost && (
              <View style={styles.column}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name="currency-usd"
                    size={20}
                    color={glassTheme.colors.primary}
                  />
                  <Text style={styles.cardTitle}>Est. Pay</Text>
                </View>
                <Text style={styles.cardValue}>
                  {formatCurrency(shift.costEstimate.totalCost)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Role Requirements Card */}
        {shift.roleRequirements && shift.roleRequirements.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="briefcase" size={24} color={glassTheme.colors.primary} />
              <Text style={styles.cardTitle}>Role Requirements</Text>
            </View>
            {shift.roleRequirements.map((req, idx) => (
              <View key={idx} style={styles.requirementRow}>
                <Text style={styles.requirementRole}>
                  {formatRole(req.role)}
                </Text>
                <View style={styles.requirementQuantity}>
                  <Text style={styles.requirementQuantityText}>
                    x{req.quantity}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Constraints Card - Only shows user's qualifications */}
        {shift.constraints &&
          shift.constraints.length > 0 &&
          (() => {
            // Calculate fulfillment for each constraint
            const assignedUsers = shift.assignedUsers || [];
            const totalConstraintSlots = shift.constraints.reduce(
              (sum, c) => sum + (c.quantity || 1),
              0
            );
            const flexibleSlots =
              shift.requiredStaffCount - totalConstraintSlots;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="shield-checkmark" size={24} color={glassTheme.colors.success} />
                  <Text style={styles.cardTitle}>Your Qualifications</Text>
                </View>
                <Text style={styles.helperText}>
                  These qualifications match your profile and are available on
                  this shift
                </Text>
                {shift.constraints
                  .map((constraint, idx) => {
                    // Get constraint name from populated object
                    let constraintName = null;

                    if (
                      constraint.constraintId &&
                      typeof constraint.constraintId === "object"
                    ) {
                      // Constraint is populated
                      constraintName =
                        constraint.constraintId.name ||
                        constraint.constraintId.description ||
                        constraint.constraintId.type;
                    } else if (
                      typeof constraint.constraintId === "string" &&
                      constraint.constraintId.length === 24
                    ) {
                      // ConstraintId is just an ObjectId string (not populated)
                      // Skip this constraint - it will be populated when shift details are fetched
                      return null;
                    } else if (constraint.name || constraint.description) {
                      // Fallback: constraint has name/description directly
                      constraintName =
                        constraint.name || constraint.description;
                    }

                    // Skip if we couldn't determine the name
                    if (!constraintName) {
                      return null;
                    }

                    const requiredQuantity = constraint.quantity || 1;

                    // Count how many assigned staff have this constraint
                    const constraintIdStr =
                      constraint.constraintId?._id || constraint.constraintId;
                    const staffWithConstraint = assignedUsers.filter((user) => {
                      // Handle populated user objects
                      const userConstraints = user.userConstraints || [];
                      return userConstraints.some((uc) => {
                        const ucConstraintId =
                          uc.constraintId?._id || uc.constraintId;
                        if (String(ucConstraintId) !== String(constraintIdStr))
                          return false;
                        // Check expiry
                        if (uc.expiryDate) {
                          const expiryDate = new Date(uc.expiryDate);
                          if (expiryDate < new Date()) return false;
                        }
                        return true;
                      });
                    }).length;

                    const fulfilled = staffWithConstraint >= requiredQuantity;

                    return (
                      <View key={idx} style={styles.requirementRow}>
                        <Text style={styles.constraintName}>
                          {constraintName}
                        </Text>
                        <View
                          style={[
                            styles.requirementQuantity,
                            fulfilled && styles.requirementQuantityFulfilled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.requirementQuantityText,
                              fulfilled &&
                                styles.requirementQuantityTextFulfilled,
                            ]}
                          >
                            {staffWithConstraint}/{requiredQuantity}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                  .filter(Boolean)}
                {flexibleSlots > 0 && (
                  <Text style={styles.remainingSlotsText}>
                    + {flexibleSlots} flexible slot
                    {flexibleSlots !== 1 ? "s" : ""} also available (no specific
                    requirements)
                  </Text>
                )}
              </View>
            );
          })()}

        {/* Notes Card */}
        {shift.notes && shift.notes.trim() && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={24} color={glassTheme.colors.primary} />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{shift.notes}</Text>
          </View>
        )}

        {/* Swap Button - Only show if from "My Shifts" and shift is not past */}
        {fromMyShifts && !isPastShift && (
          <TouchableOpacity
            style={styles.swapButton}
            onPress={() => {
              setUserSearchQuery("");
              setUserSearchResults([]);
              loadUserSuggestions();
              setShowSwapModal(true);
            }}
          >
            <Ionicons name="swap-horizontal" size={20} color="#fff" />
            <Text style={styles.swapButtonText}>Request Shift Swap</Text>
          </TouchableOpacity>
        )}

        {/* Claim Status or Claim Button - Only show if not from "My Shifts" */}
        {!fromMyShifts &&
          (() => {
            const claimStatus = personalized?.claimStatus;

            if (claimStatus === "approved") {
              return (
                <View style={styles.claimStatusContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={glassTheme.colors.success} />
                  <Text style={styles.claimStatusText}>Claim Approved</Text>
                  <Text style={styles.claimStatusSubtext}>
                    You're assigned to this shift
                  </Text>
                </View>
              );
            } else if (claimStatus === "pending") {
              return (
                <View style={styles.claimStatusContainer}>
                  <Ionicons name="time" size={24} color={glassTheme.colors.warning} />
                  <Text style={styles.claimStatusText}>Claim Pending</Text>
                  <Text style={styles.claimStatusSubtext}>
                    Waiting for manager approval
                  </Text>
                </View>
              );
            } else if (claimStatus === "rejected") {
              return (
                <View style={styles.claimStatusContainer}>
                  <Ionicons name="close-circle" size={24} color={glassTheme.colors.danger} />
                  <Text style={styles.claimStatusText}>Claim Rejected</Text>
                  <Text style={styles.claimStatusSubtext}>
                    Your claim was not approved
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                style={[
                  styles.claimButton,
                  (isFullyAssigned || claiming) && styles.claimButtonDisabled,
                ]}
                onPress={handleClaimShift}
                disabled={isFullyAssigned || claiming}
              >
                {claiming ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="white" />
                    <Text style={styles.claimButtonText}>
                      {isFullyAssigned
                        ? "Shift Fully Assigned"
                        : "Claim This Shift"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })()}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Swap Request Modal */}
      <Modal
        visible={showSwapModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSwapModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Shift Swap</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)} style={{ padding: 12 }}>
                <Ionicons name="close" size={24} color={glassTheme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalShiftInfo}>
              <Text style={styles.modalShiftInfoLabel}>Your Shift</Text>
              <Text style={styles.modalShiftInfoText}>
                {shift.locationId?.name ||
                  shift.location?.name ||
                  "Unknown Location"}
              </Text>
              <Text style={styles.modalShiftInfoTime}>
                {shift.startTime
                  ? format(new Date(shift.startTime), "MMM d, yyyy 'at' h:mm a")
                  : "TBD"}
              </Text>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Select User to Swap With</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or email..."
                  value={userSearchQuery}
                  onChangeText={(text) => {
                    setUserSearchQuery(text);
                    searchUsersForSwap(text);
                  }}
                  onFocus={() => {
                    if (!userSearchQuery) {
                      loadUserSuggestions();
                    }
                  }}
                />
                {showUserDropdown &&
                  (userSearchResults.length > 0 ||
                    userSuggestions.length > 0) && (
                    <View style={styles.searchDropdown}>
                      {(userSearchQuery
                        ? userSearchResults
                        : userSuggestions
                      ).map((user) => (
                        <TouchableOpacity
                          key={user._id}
                          style={styles.searchDropdownItem}
                          onPress={() => {
                            setTargetUserId(user._id);
                            setTargetUserName(user.name || user.email);
                            setUserSearchQuery(user.name || user.email);
                            setShowUserDropdown(false);
                          }}
                        >
                          <Text style={styles.searchDropdownItemText}>
                            {user.name || user.email}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Message (Optional)</Text>
              <TextInput
                style={[styles.searchInput, styles.textArea]}
                placeholder="Add a message..."
                value={swapMessage}
                onChangeText={setSwapMessage}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSwapModal(false)}
                disabled={submittingSwap}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleRequestSwap}
                disabled={submittingSwap || !targetUserId}
              >
                {submittingSwap ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>
                    Send Request
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: glassTheme.colors.background.screen,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: glassTheme.colors.background.screen,
  },
  header: {
    backgroundColor: glassTheme.glass.light.backgroundStrong,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glassTheme.border.color,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dateTimeContainer: {
    flex: 1,
  },
  date: {
    fontSize: 16,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  time: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    marginTop: 4,
  },
  filledBadge: {
    backgroundColor: `${glassTheme.colors.success}18`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filledBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.success,
    marginLeft: 6,
  },
  card: {
    backgroundColor: glassTheme.glass.light.backgroundStrong,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: glassTheme.radius.large,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    ...glassTheme.shadows.small,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  cardSubtext: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    marginTop: 4,
  },
  twoColumnLayout: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    marginRight: 16,
  },
  staffingInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  staffCount: {
    alignItems: "center",
    flex: 1,
  },
  staffCountNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  staffCountLabel: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    marginTop: 4,
  },
  staffDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: glassTheme.border.color,
    marginHorizontal: 16,
  },
  staffAvailable: {
    fontSize: 12,
    color: glassTheme.colors.success,
    textAlign: "center",
    fontWeight: "500",
  },
  requirementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glassTheme.border.color,
  },
  requirementRole: {
    fontSize: 14,
    color: glassTheme.colors.text.primary,
    fontWeight: "500",
  },
  requirementQuantity: {
    backgroundColor: `${glassTheme.colors.warning}18`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requirementQuantityFulfilled: {
    backgroundColor: `${glassTheme.colors.success}18`,
  },
  requirementQuantityText: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.warning,
  },
  requirementQuantityTextFulfilled: {
    color: glassTheme.colors.success,
  },
  constraintName: {
    fontSize: 14,
    color: glassTheme.colors.text.primary,
  },
  helperText: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
    marginBottom: 12,
    fontStyle: "italic",
  },
  remainingSlotsText: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
    marginTop: 12,
    fontStyle: "italic",
  },
  notesText: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    lineHeight: 20,
  },
  claimButton: {
    backgroundColor: glassTheme.colors.primary,
    marginHorizontal: 12,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: glassTheme.radius.large,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    ...glassTheme.shadows.medium,
  },
  claimButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.10)",
    ...glassTheme.shadows.small,
  },
  claimButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  claimStatusContainer: {
    backgroundColor: glassTheme.glass.light.backgroundStrong,
    marginHorizontal: 12,
    marginVertical: 16,
    paddingVertical: 20,
    borderRadius: glassTheme.radius.large,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
  },
  claimStatusText: {
    fontSize: 16,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginTop: 8,
  },
  claimStatusSubtext: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    marginTop: 4,
  },
  spacer: {
    height: 20,
  },
  swapButton: {
    backgroundColor: glassTheme.colors.info,
    marginHorizontal: 12,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: glassTheme.radius.large,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    ...glassTheme.shadows.medium,
  },
  swapButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: glassTheme.glass.light.backgroundStrong,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "90%",
    borderTopWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  modalShiftInfo: {
    padding: 16,
    backgroundColor: glassTheme.glass.light.background,
    borderRadius: glassTheme.radius.medium,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
  },
  modalShiftInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.text.tertiary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalShiftInfoText: {
    fontSize: 16,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 4,
  },
  modalShiftInfoTime: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 8,
  },
  searchContainer: {
    position: "relative",
  },
  searchInput: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: glassTheme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: glassTheme.colors.text.primary,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  searchDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: glassTheme.glass.light.backgroundStrong,
    borderRadius: glassTheme.radius.medium,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    zIndex: 1000,
    ...glassTheme.shadows.medium,
  },
  searchDropdownItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glassTheme.border.color,
  },
  searchDropdownItemText: {
    fontSize: 14,
    color: glassTheme.colors.text.primary,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: glassTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: glassTheme.border.color,
  },
  modalButtonPrimary: {
    backgroundColor: glassTheme.colors.primary,
  },
  modalButtonDanger: {
    backgroundColor: glassTheme.colors.danger,
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default ShiftDetailsScreen;
