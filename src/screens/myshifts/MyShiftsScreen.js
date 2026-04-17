import React, { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { format, isPast, isFuture, isToday, isTomorrow } from "date-fns";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { TabView } from "react-native-tab-view";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../components/Toast";
import {
  getMyShiftsData,
  getMyShiftsCounts,
  requestShiftSwap,
  getSwapRequests,
  proposeShiftForSwap,
  rejectSwapRequest,
  cancelSwapRequest,
  searchStaff,
  completeShift,
  rejectShiftCompletion,
  checkInToShift,
  checkOutFromShift,
  getShiftClockStatus,
} from "../../services/apiHelper";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import glassTheme from "../../theme/glassTheme";
import { TAB_BAR_CONTENT_HEIGHT } from "../../components/LiquidTabBar";

let BlurView;
try {
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}

const TAB_ROUTES = [
  { key: "upcoming", label: "Upcoming", icon: "calendar-outline" },
  { key: "pendingClaims", label: "Pending", icon: "hourglass-outline" },
  { key: "needsReview", label: "Review", icon: "alert-circle-outline" },
  { key: "completed", label: "Completed", icon: "checkmark-circle-outline" },
  { key: "swapRequests", label: "Swaps", icon: "swap-horizontal" },
];

const MyShiftsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  
  // Get initial tab from route params, or default to "upcoming"
  const getInitialTab = () => {
    // Check route params first
    if (route.params?.initialTab) {
      return route.params.initialTab;
    }
    // Check parent tab navigator params
    const parentState = navigation.getParent()?.getState();
    const myShiftsTabRoute = parentState?.routes?.find(r => r.name === "MyShifts");
    if (myShiftsTabRoute?.params?.initialTab) {
      return myShiftsTabRoute.params.initialTab;
    }
    return "upcoming";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [tabCounts, setTabCounts] = useState({
    upcoming: null,
    pendingClaims: null,
    needsReview: null,
    completed: null,
    swapRequests: null,
  });

  // Swap request state
  const [incomingSwapRequests, setIncomingSwapRequests] = useState([]);
  const [outgoingSwapRequests, setOutgoingSwapRequests] = useState([]);
  const [loadingSwapRequests, setLoadingSwapRequests] = useState(false);

  // Swap modal state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserName, setTargetUserName] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [submittingSwap, setSubmittingSwap] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Propose shift modal state
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [selectedSwapRequest, setSelectedSwapRequest] = useState(null);
  const [proposedShiftId, setProposedShiftId] = useState("");
  const [userShifts, setUserShifts] = useState([]);
  const [loadingUserShifts, setLoadingUserShifts] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Complete shift modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedShiftForCompletion, setSelectedShiftForCompletion] = useState(null);
  const [completionData, setCompletionData] = useState({
    hasIssues: false,
    issueDescription: "",
    actualAttendees: [],
    noShows: [],
  });
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [completionStaffSearchQuery, setCompletionStaffSearchQuery] = useState("");
  const [completionStaffSearchResults, setCompletionStaffSearchResults] = useState([]);
  const [searchingCompletionStaff, setSearchingCompletionStaff] = useState(false);
  const [showCompletionStaffDropdown, setShowCompletionStaffDropdown] = useState(false);

  // Check-in state
  const [clockStatuses, setClockStatuses] = useState({});
  const [checkingInShiftId, setCheckingInShiftId] = useState(null);

  const PAGE_SIZE = 10;

  // Load tab counts
  const loadTabCounts = useCallback(async () => {
    try {
      const result = await getMyShiftsCounts();
      if (result.success) {
        setTabCounts(result.data.counts || {});
      }
    } catch (error) {
      console.error("Error loading tab counts:", error);
    }
  }, []);

  // Load swap requests
  const loadSwapRequests = useCallback(async () => {
    try {
      setLoadingSwapRequests(true);
      const result = await getSwapRequests();
      if (result.success) {
        setIncomingSwapRequests(result.data.incoming || []);
        setOutgoingSwapRequests(result.data.outgoing || []);
      }
    } catch (error) {
      console.error("Error loading swap requests:", error);
    } finally {
      setLoadingSwapRequests(false);
    }
  }, []);

  // Update swap requests count
  useEffect(() => {
    const totalSwapCount = incomingSwapRequests.length + outgoingSwapRequests.length;
    setTabCounts((prev) => ({
      ...prev,
      swapRequests: totalSwapCount > 0 ? totalSwapCount : null,
    }));
  }, [incomingSwapRequests, outgoingSwapRequests]);

  // Load shifts data
  const loadData = useCallback(
    async (tab = activeTab, reset = false) => {
      try {
        if (reset) {
          setOffset(0);
          setShifts([]);
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const currentOffset = reset ? 0 : offset;
        const result = await getMyShiftsData(tab, PAGE_SIZE, currentOffset);

        if (result.success) {
          const newShifts = result.data.shifts || [];
          if (reset) {
            setShifts(newShifts);
          } else {
            setShifts((prev) => [...prev, ...newShifts]);
          }
          setHasMore(result.data.hasMore || false);
          setOffset((prev) => prev + newShifts.length);
        } else {
          Alert.alert("Error", result.message || "Failed to load shifts");
        }
      } catch (error) {
        console.error("Error loading shifts:", error);
        Alert.alert("Error", "Failed to load shifts");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [activeTab, offset]
  );

  // Handle navigation params when they change
  // This processes params from direct navigation or tab navigation
  useEffect(() => {
    // Check route params first
    let initialTab = route.params?.initialTab;
    
    // If not in route params, check parent tab navigator (for navigation from Dashboard)
    if (!initialTab) {
      const parentRoute = navigation.getParent()?.getState()?.routes?.find(
        r => r.name === "MyShifts"
      );
      initialTab = parentRoute?.params?.initialTab;
    }
    
    // Only update if we have a param that's different from current tab
    if (initialTab) {
      setActiveTab((currentTab) => {
        if (initialTab !== currentTab) {
          setOffset(0);
          setShifts([]);
          // Clear params after using them
          if (route.params?.initialTab) {
            navigation.setParams({ initialTab: undefined });
          }
          return initialTab;
        }
        return currentTab;
      });
    }
  }, [route.params?.initialTab, navigation]);

  // Also check params when screen comes into focus (handles tab navigation)
  useFocusEffect(
    useCallback(() => {
      const parentRoute = navigation.getParent()?.getState()?.routes?.find(
        r => r.name === "MyShifts"
      );
      const initialTab = parentRoute?.params?.initialTab || route.params?.initialTab;
      
      if (initialTab) {
        setActiveTab((currentTab) => {
          if (initialTab !== currentTab) {
            setOffset(0);
            setShifts([]);
            return initialTab;
          }
          return currentTab;
        });
      }
    }, [navigation, route.params?.initialTab])
  );

  useEffect(() => {
    loadTabCounts();
    loadSwapRequests();
  }, [loadTabCounts, loadSwapRequests]);

  useEffect(() => {
    // Don't call loadData for swapRequests - they're loaded separately via loadSwapRequests
    if (activeTab !== "swapRequests") {
      loadData(activeTab, true);
    }
  }, [activeTab]);

  // Called by TabView when user swipes to a new tab
  const handleTabIndexChange = useCallback((index) => {
    const newTab = TAB_ROUTES[index].key;
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      setOffset(0);
      setShifts([]);
    }
  }, [activeTab]);

  // Computed tab index for TabView
  const tabIndex = TAB_ROUTES.findIndex((r) => r.key === activeTab);

  const onRefresh = () => {
    setRefreshing(true);
    loadTabCounts();
    loadSwapRequests();
    // Don't call loadData for swapRequests - they're loaded separately via loadSwapRequests
    if (activeTab !== "swapRequests") {
      loadData(activeTab, true);
    } else {
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(activeTab, false);
    }
  };

  // User search for swap
  const searchUsersForSwap = useCallback(async (query) => {
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
  }, [state.user, targetUserId]);

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
        selectedShiftForSwap._id,
        targetUserId,
        swapMessage
      );

      if (result.success) {
        setShowSwapModal(false);
        setSelectedShiftForSwap(null);
        setTargetUserId("");
        setTargetUserName("");
        setSwapMessage("");
        setUserSearchQuery("");
        await loadSwapRequests();
        await loadData(activeTab, true);
        toast.success("Swap request sent successfully!");
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

  // Handle propose shift
  const handleProposeShift = async (request) => {
    setSelectedSwapRequest(request);
    setProposedShiftId("");
    setUserShifts([]);

    setLoadingUserShifts(true);
    try {
      const result = await getMyShiftsData("upcoming", 100, 0);
      if (result.success) {
        setUserShifts(result.data.shifts || []);
      }
    } catch (error) {
      console.error("Error loading user shifts:", error);
    } finally {
      setLoadingUserShifts(false);
    }

    setShowProposeModal(true);
  };

  const handleSubmitProposal = async (acceptWithoutProposing = false) => {
    const shiftIdToPropose = acceptWithoutProposing ? null : proposedShiftId;

    if (!acceptWithoutProposing && !shiftIdToPropose) {
      Alert.alert("Error", "Please select a shift to propose, or choose to accept without proposing");
      return;
    }

    try {
      setSubmittingProposal(true);
      const result = await proposeShiftForSwap(selectedSwapRequest._id, shiftIdToPropose);

      if (result.success) {
        setShowProposeModal(false);
        setSelectedSwapRequest(null);
        setProposedShiftId("");
        await loadSwapRequests();
        await loadData(activeTab, true);
        toast.success(
          acceptWithoutProposing
            ? "Swap request accepted! Waiting for manager approval."
            : "Shift proposed successfully! Waiting for manager approval."
        );
      } else {
        Alert.alert("Error", result.message || "Failed to propose shift");
      }
    } catch (error) {
      console.error("Error proposing shift:", error);
      Alert.alert("Error", "Error proposing shift");
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Handle reject swap
  const handleRejectSwap = async (requestId) => {
    Alert.alert(
      "Reject Swap Request",
      "Are you sure you want to reject this swap request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await rejectSwapRequest(requestId);
              if (result.success) {
                await loadSwapRequests();
                toast.success("Swap request rejected");
              } else {
                Alert.alert("Error", result.message || "Failed to reject swap request");
              }
            } catch (error) {
              console.error("Error rejecting swap:", error);
              Alert.alert("Error", "Error rejecting swap request");
            }
          },
        },
      ]
    );
  };

  // Handle cancel swap
  const handleCancelSwap = async (requestId) => {
    Alert.alert(
      "Cancel Swap Request",
      "Are you sure you want to cancel this swap request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await cancelSwapRequest(requestId);
              if (result.success) {
                await loadSwapRequests();
                toast.success("Swap request cancelled");
              } else {
                Alert.alert("Error", result.message || "Failed to cancel swap request");
              }
            } catch (error) {
              console.error("Error cancelling swap:", error);
              Alert.alert("Error", "Error cancelling swap request");
            }
          },
        },
      ]
    );
  };

  // Handle complete shift
  const handleCompleteShift = async () => {
    if (!selectedShiftForCompletion) return;

    try {
      setSubmittingCompletion(true);
      const result = completionData.hasIssues
        ? await rejectShiftCompletion(selectedShiftForCompletion._id, {
            confirmationNotes: completionData.issueDescription,
          })
        : await completeShift(selectedShiftForCompletion._id, {
            actualAttendees: completionData.actualAttendees,
            noShows: completionData.noShows,
          });

      if (result.success) {
        setShowCompleteModal(false);
        setSelectedShiftForCompletion(null);
        setCompletionData({
          hasIssues: false,
          issueDescription: "",
          actualAttendees: [],
          noShows: [],
        });
        await loadData(activeTab, true);
        toast.success("Shift completion recorded");
      } else {
        Alert.alert("Error", result.message || "Failed to complete shift");
      }
    } catch (error) {
      console.error("Error completing shift:", error);
      Alert.alert("Error", "Error completing shift");
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Load clock-in status for each upcoming shift
  const loadClockStatuses = useCallback(async (shiftsToCheck) => {
    const results = await Promise.all(
      shiftsToCheck.map((shift) => getShiftClockStatus(shift._id))
    );
    setClockStatuses((prev) => {
      const next = { ...prev };
      shiftsToCheck.forEach((shift, i) => {
        if (results[i].success) {
          next[shift._id] = results[i].data;
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (activeTab === "upcoming" && shifts.length > 0) {
      loadClockStatuses(shifts);
    }
  }, [shifts, activeTab, loadClockStatuses]);

  const getGPSCoords = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      return null;
    }
  };

  const refreshClockStatus = useCallback(async (shiftId) => {
    const result = await getShiftClockStatus(shiftId);
    if (result.success) {
      setClockStatuses((prev) => ({ ...prev, [shiftId]: result.data }));
    }
  }, []);

  const handleCheckIn = async (shift) => {
    setCheckingInShiftId(shift._id);
    try {
      const coords = await getGPSCoords();
      const result = await checkInToShift(shift._id, coords);
      if (result.success) {
        setClockStatuses((prev) => ({
          ...prev,
          [shift._id]: { isCheckedIn: true, clockEntry: result.data.clockEntry },
        }));
        toast.success("Checked in successfully");
      } else {
        Alert.alert("Check-In Failed", result.message || "Could not check in");
        await refreshClockStatus(shift._id);
      }
    } catch (error) {
      Alert.alert("Error", "Could not complete check-in");
      await refreshClockStatus(shift._id);
    } finally {
      setCheckingInShiftId(null);
    }
  };

  const handleCheckOut = async (shift) => {
    setCheckingInShiftId(shift._id);
    try {
      const coords = await getGPSCoords();
      const result = await checkOutFromShift(shift._id, coords);
      if (result.success) {
        setClockStatuses((prev) => ({
          ...prev,
          [shift._id]: { isCheckedIn: false, clockEntry: result.data.clockEntry },
        }));
        toast.success("Checked out successfully");
      } else {
        Alert.alert("Check-Out Failed", result.message || "Could not check out");
        await refreshClockStatus(shift._id);
      }
    } catch (error) {
      Alert.alert("Error", "Could not complete check-out");
      await refreshClockStatus(shift._id);
    } finally {
      setCheckingInShiftId(null);
    }
  };

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const CardContainer = liquidGlass ? GlassView : (BlurView || View);
  const cardProps = liquidGlass
    ? { glassEffectStyle: "regular" }
    : BlurView
    ? { intensity: 20, tint: "light" }
    : {};

  const renderShiftCard = (shift) => {
    const location = shift.locationId?.name || "Unknown Location";
    const startDate = shift.startTime ? new Date(shift.startTime) : null;
    const endDate = shift.endTime ? new Date(shift.endTime) : null;
    
    // Format date with relative indicators
    let dateDisplay = startDate ? format(startDate, "MMM d, yyyy") : "TBD";
    if (startDate && isToday(startDate)) {
      dateDisplay = "Today";
    } else if (startDate && isTomorrow(startDate)) {
      dateDisplay = "Tomorrow";
    }
    
    const timeDisplay = startDate && endDate 
      ? `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`
      : "TBD";
    
    const isPastShift = endDate && isPast(endDate);
    const isConfirmed = shift.confirmationStatus === "confirmed";
    const needsReview = isPastShift && !isConfirmed && shift.assignedUsers?.length > 0;
    const isUpcoming = !isPastShift;
    const clockStatus = clockStatuses[shift._id];
    const isCheckedIn = clockStatus?.isCheckedIn ?? false;
    const clockInTime = clockStatus?.clockEntry?.clockInTime;

    return (
      <TouchableOpacity
        key={shift._id}
        style={styles.shiftCard}
        onPress={() => navigation.navigate("shift-details", { shift, fromMyShifts: true })}
        activeOpacity={0.7}
      >
        <CardContainer style={styles.shiftCardInner} {...cardProps}>
          {/* Header with location and status */}
          <View style={styles.shiftCardHeader}>
            <View style={styles.shiftCardHeaderLeft}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color={glassTheme.colors.primary} />
                <Text style={styles.shiftCardLocation}>{location}</Text>
              </View>
              <View style={styles.dateTimeRow}>
                <Ionicons name="calendar-outline" size={18} color={glassTheme.colors.text.secondary} />
                <Text style={styles.shiftCardDate}>{dateDisplay}</Text>
              </View>
              <View style={styles.dateTimeRow}>
                <Ionicons name="time-outline" size={18} color={glassTheme.colors.text.secondary} />
                <Text style={styles.shiftCardTime}>{timeDisplay}</Text>
              </View>
            </View>
            <View style={styles.shiftCardBadges}>
              {isConfirmed && (
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Ionicons name="checkmark-circle" size={14} color={glassTheme.colors.success} />
                  <Text style={[styles.badgeText, { color: glassTheme.colors.success }]}>Completed</Text>
                </View>
              )}
              {needsReview && (
                <View style={[styles.badge, styles.badgeWarning]}>
                  <Ionicons name="alert-circle" size={14} color={glassTheme.colors.warning} />
                  <Text style={[styles.badgeText, { color: glassTheme.colors.warning }]}>Needs Review</Text>
                </View>
              )}
              {isUpcoming && isCheckedIn && (
                <View style={[styles.badge, { backgroundColor: `${glassTheme.colors.success}20` }]}>
                  <Ionicons name="radio-button-on" size={12} color={glassTheme.colors.success} />
                  <Text style={[styles.badgeText, { color: glassTheme.colors.success }]}>
                    {clockInTime ? `In since ${format(new Date(clockInTime), "h:mm a")}` : "Checked In"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action buttons */}
          {needsReview && (
            <View style={styles.shiftCardActions}>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => {
                  setSelectedShiftForCompletion(shift);
                  setCompletionData({
                    hasIssues: false,
                    issueDescription: "",
                    actualAttendees: shift.assignedUsers || [],
                    noShows: [],
                  });
                  setShowCompleteModal(true);
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.completeButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          )}
          {isUpcoming && (
            <View style={styles.shiftCardActions}>
              {isCheckedIn ? (
                <TouchableOpacity
                  style={styles.checkOutButton}
                  onPress={() => handleCheckOut(shift)}
                  disabled={checkingInShiftId === shift._id}
                >
                  {checkingInShiftId === shift._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={18} color="#fff" />
                      <Text style={styles.checkOutButtonText}>Check Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.checkInButton}
                  onPress={() => handleCheckIn(shift)}
                  disabled={checkingInShiftId === shift._id}
                >
                  {checkingInShiftId === shift._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={18} color="#fff" />
                      <Text style={styles.checkInButtonText}>Check In</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </CardContainer>
      </TouchableOpacity>
    );
  };

  const renderSwapRequestCard = (request, isIncoming = false) => {
    const requesterShift = request.requesterShiftId;
    const targetShift = request.targetShiftId;
    const requester = request.requesterUserId;
    const target = request.targetUserId;

    const getStatusColor = () => {
      if (request.status === "approved") return glassTheme.colors.success;
      if (request.status === "rejected") return glassTheme.colors.danger;
      if (request.status === "proposed") return glassTheme.colors.info;
      return glassTheme.colors.warning;
    };

    const getStatusBg = () => {
      if (request.status === "approved") return `${glassTheme.colors.success}20`;
      if (request.status === "rejected") return `${glassTheme.colors.danger}20`;
      if (request.status === "proposed") return `${glassTheme.colors.info}22`;
      return `${glassTheme.colors.warning}20`;
    };

    return (
      <View key={request._id} style={styles.swapRequestCard}>
        <CardContainer style={styles.swapRequestCardInner} {...cardProps}>
          {/* Header */}
          <View style={styles.swapRequestHeader}>
            <View style={styles.swapRequestUser}>
              <View style={[styles.swapRequestIcon, { backgroundColor: `${getStatusColor()}20` }]}>
                <Ionicons
                  name={isIncoming ? "arrow-down" : "arrow-up"}
                  size={18}
                  color={getStatusColor()}
                />
              </View>
              <View style={styles.swapRequestUserInfo}>
                <Text style={styles.swapRequestUserLabel}>
                  {isIncoming ? "From" : "To"}
                </Text>
                <Text style={styles.swapRequestUserName} numberOfLines={1}>
                  {isIncoming
                    ? requester?.name || requester?.email || "Unknown"
                    : target?.name || target?.email || "Unknown"}
                </Text>
              </View>
            </View>
            <View style={[styles.swapRequestStatus, { backgroundColor: getStatusBg() }]}>
              <Text style={[styles.swapRequestStatusText, { color: getStatusColor() }]}>
                {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || "Pending"}
              </Text>
            </View>
          </View>

          {/* Shifts */}
          <View style={styles.swapRequestShifts}>
            <View style={styles.swapRequestShiftBox}>
              <Text style={styles.swapRequestShiftLabel}>
                {isIncoming ? "Their Shift" : "Your Shift"}
              </Text>
              <View style={styles.swapRequestShiftDetails}>
                <Ionicons name="location" size={14} color={glassTheme.colors.text.secondary} />
                <Text style={styles.swapRequestShiftLocation} numberOfLines={1}>
                  {requesterShift?.locationId?.name || "Unknown Location"}
                </Text>
              </View>
              <View style={styles.swapRequestShiftDetails}>
                <Ionicons name="time-outline" size={14} color={glassTheme.colors.text.secondary} />
                <Text style={styles.swapRequestShiftTime} numberOfLines={1}>
                  {requesterShift?.startTime
                    ? format(new Date(requesterShift.startTime), "MMM d, h:mm a")
                    : "TBD"}
                </Text>
              </View>
            </View>

            {targetShift ? (
              <View style={styles.swapRequestShiftBox}>
                <Text style={styles.swapRequestShiftLabel}>
                  {isIncoming ? "Your Shift" : "Their Shift"}
                </Text>
                <View style={styles.swapRequestShiftDetails}>
                  <Ionicons name="location" size={14} color={glassTheme.colors.text.secondary} />
                  <Text style={styles.swapRequestShiftLocation} numberOfLines={1}>
                    {targetShift?.locationId?.name || "Unknown Location"}
                  </Text>
                </View>
                <View style={styles.swapRequestShiftDetails}>
                  <Ionicons name="time-outline" size={14} color={glassTheme.colors.text.secondary} />
                  <Text style={styles.swapRequestShiftTime} numberOfLines={1}>
                    {targetShift?.startTime
                      ? format(new Date(targetShift.startTime), "MMM d, h:mm a")
                      : "TBD"}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.swapRequestShiftBox, styles.swapRequestShiftBoxEmpty]}>
                <Text style={styles.swapRequestShiftLabel}>
                  {isIncoming ? "Your Shift" : "Their Shift"}
                </Text>
                <Text style={styles.swapRequestShiftEmptyText}>
                  {isIncoming ? "No shift proposed yet" : "Waiting for response"}
                </Text>
              </View>
            )}
          </View>

          {request.message && (
            <View style={styles.swapRequestMessage}>
              <Ionicons name="chatbubble-outline" size={14} color={glassTheme.colors.text.secondary} />
              <Text style={styles.swapRequestMessageText} numberOfLines={2}>
                {request.message}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.swapRequestActions}>
            {isIncoming && request.status === "pending" && (
              <>
                <TouchableOpacity
                  style={[styles.swapRequestActionButton, styles.swapRequestActionButtonPrimary]}
                  onPress={() => handleProposeShift(request)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.swapRequestActionButtonText}>Propose Shift</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swapRequestActionButton, styles.swapRequestActionButtonDanger]}
                  onPress={() => handleRejectSwap(request._id)}
                >
                  <Ionicons name="close-circle" size={18} color={glassTheme.colors.danger} />
                  <Text style={[styles.swapRequestActionButtonText, { color: glassTheme.colors.danger }]}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {!isIncoming && (request.status === "pending" || request.status === "proposed") && (
              <TouchableOpacity
                style={[styles.swapRequestActionButton, styles.swapRequestActionButtonDanger]}
                onPress={() => handleCancelSwap(request._id)}
              >
                <Ionicons name="close-circle" size={18} color={glassTheme.colors.danger} />
                <Text style={[styles.swapRequestActionButtonText, { color: glassTheme.colors.danger }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </CardContainer>
      </View>
    );
  };

  const renderContent = () => {
    if (activeTab === "swapRequests") {
      return (
        <View style={styles.swapRequestsContainer}>
          {incomingSwapRequests.length > 0 && (
            <View style={styles.swapRequestsSection}>
              <Text style={styles.swapRequestsSectionTitle}>Incoming Requests</Text>
              {incomingSwapRequests.map((request) => renderSwapRequestCard(request, true))}
            </View>
          )}

          {outgoingSwapRequests.length > 0 && (
            <View style={styles.swapRequestsSection}>
              <Text style={styles.swapRequestsSectionTitle}>My Requests</Text>
              {outgoingSwapRequests.map((request) => renderSwapRequestCard(request, false))}
            </View>
          )}

          {incomingSwapRequests.length === 0 && outgoingSwapRequests.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="swap-horizontal" size={64} color={glassTheme.colors.text.tertiary} />
              <Text style={styles.emptyStateText}>No swap requests</Text>
              <Text style={styles.emptyStateSubtext}>
                Swap requests will appear here when you request or receive swaps
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (loading && shifts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={glassTheme.colors.primary} />
        </View>
      );
    }

    if (shifts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={glassTheme.colors.text.tertiary} />
          <Text style={styles.emptyStateText}>
            {activeTab === "upcoming"
              ? "No upcoming shifts"
              : activeTab === "pendingClaims"
              ? "No pending claims"
              : activeTab === "needsReview"
              ? "No shifts needing review"
              : "No completed shifts"}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={shifts}
        renderItem={({ item }) => renderShiftCard(item)}
        keyExtractor={(item) => item._id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={glassTheme.colors.primary} />
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.shiftListContent}
      />
    );
  };

  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.screen}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Shifts</Text>
      </View>

      {/* Swipeable Tab View — tab bar + content */}
      <TabView
        style={styles.tabView}
        navigationState={{ index: tabIndex < 0 ? 0 : tabIndex, routes: TAB_ROUTES }}
        renderScene={({ route }) => {
          if (route.key !== activeTab) {
            return (
              <View
                style={{ flex: 1, backgroundColor: glassTheme.colors.background.primary }}
              />
            );
          }
          return <View style={{ flex: 1 }}>{renderContent()}</View>;
        }}
        onIndexChange={handleTabIndexChange}
        initialLayout={{ width: screenWidth }}
        renderTabBar={(props) => (
          <View style={styles.filtersContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              {TAB_ROUTES.map((tab, i) => {
                const isActive = props.navigationState.index === i;
                const count = tabCounts[tab.key];
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}
                    onPress={() => props.jumpTo(tab.key)}
                    activeOpacity={0.7}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${tab.label}${count ? `, ${count} items` : ""}`}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={16}
                      color={isActive ? "#fff" : glassTheme.colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.filterChipLabel,
                        isActive && styles.filterChipLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                    {count !== null && count !== undefined && count > 0 && (
                      <View
                        style={[
                          styles.filterChipBadge,
                          isActive && styles.filterChipBadgeActive,
                        ]}
                      >
                        <Text style={styles.filterChipBadgeText}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
        lazy
        lazyPreloadDistance={0}
      />

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
              <TouchableOpacity
                onPress={() => setShowSwapModal(false)}
                style={{ padding: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={glassTheme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedShiftForSwap && (
              <View style={styles.modalShiftInfo}>
                <Text style={styles.modalShiftInfoLabel}>Your Shift</Text>
                <Text style={styles.modalShiftInfoText}>
                  {selectedShiftForSwap.locationId?.name || "Unknown Location"}
                </Text>
                <Text style={styles.modalShiftInfoTime}>
                  {selectedShiftForSwap.startTime
                    ? format(new Date(selectedShiftForSwap.startTime), "MMM d, yyyy 'at' h:mm a")
                    : "TBD"}
                </Text>
              </View>
            )}

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
                {showUserDropdown && (userSearchResults.length > 0 || userSuggestions.length > 0) && (
                  <View style={styles.searchDropdown}>
                    {(userSearchQuery ? userSearchResults : userSuggestions).map((user) => (
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
                  <Text style={styles.modalButtonPrimaryText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Propose Shift Modal */}
      <Modal
        visible={showProposeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProposeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentScroll}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respond to Swap Request</Text>
              <TouchableOpacity
                onPress={() => setShowProposeModal(false)}
                style={{ padding: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={glassTheme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedSwapRequest && (
              <View style={styles.modalShiftInfo}>
                <Text style={styles.modalShiftInfoLabel}>Their Shift (You'll Receive)</Text>
                <Text style={styles.modalShiftInfoText}>
                  {selectedSwapRequest.requesterShiftId?.locationId?.name || "Unknown Location"}
                </Text>
                <Text style={styles.modalShiftInfoTime}>
                  {selectedSwapRequest.requesterShiftId?.startTime
                    ? format(
                        new Date(selectedSwapRequest.requesterShiftId.startTime),
                        "MMM d, yyyy 'at' h:mm a"
                      )
                    : "TBD"}
                </Text>
              </View>
            )}

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Option 1: Select Your Shift to Swap</Text>
              {loadingUserShifts ? (
                <ActivityIndicator size="small" color={glassTheme.colors.primary} />
              ) : userShifts.length === 0 ? (
                <Text style={styles.modalHelperText}>No upcoming shifts available</Text>
              ) : (
                <ScrollView style={styles.shiftsList} nestedScrollEnabled>
                  {userShifts.map((shift) => {
                    const isSelected = proposedShiftId === shift._id;
                    return (
                      <TouchableOpacity
                        key={shift._id}
                        style={[
                          styles.shiftOption,
                          isSelected && styles.shiftOptionSelected,
                        ]}
                        onPress={() => setProposedShiftId(shift._id)}
                      >
                        <View style={styles.shiftOptionContent}>
                          <Text style={styles.shiftOptionLocation}>
                            {shift.locationId?.name || "Unknown Location"}
                          </Text>
                          <Text style={styles.shiftOptionTime}>
                            {shift.startTime
                              ? format(new Date(shift.startTime), "MMM d, yyyy 'at' h:mm a")
                              : "TBD"}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={glassTheme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.modalDivider}>
              <View style={styles.modalDividerLine} />
              <Text style={styles.modalDividerText}>Or</Text>
              <View style={styles.modalDividerLine} />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Option 2: Accept Without Proposing</Text>
              <View style={styles.acceptWithoutProposingBox}>
                <Text style={styles.acceptWithoutProposingText}>
                  Accept this swap request without proposing a shift in return. You'll receive their shift, and they won't receive anything back.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonAccept]}
                  onPress={() => handleSubmitProposal(true)}
                  disabled={submittingProposal}
                >
                  <Text style={styles.modalButtonAcceptText}>Accept Without Proposing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => handleSubmitProposal(false)}
                  disabled={submittingProposal || !proposedShiftId}
                >
                  {submittingProposal ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonPrimaryText}>Propose Shift</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, styles.modalButtonFullWidth]}
                onPress={() => setShowProposeModal(false)}
                disabled={submittingProposal}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Complete Shift Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentScroll}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Shift</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <Ionicons name="close" size={24} color={glassTheme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedShiftForCompletion && (
              <View style={styles.modalShiftInfo}>
                <Text style={styles.modalShiftInfoLabel}>Shift Details</Text>
                <Text style={styles.modalShiftInfoText}>
                  {selectedShiftForCompletion.locationId?.name || "Unknown Location"}
                </Text>
                <Text style={styles.modalShiftInfoTime}>
                  {selectedShiftForCompletion.startTime
                    ? format(
                        new Date(selectedShiftForCompletion.startTime),
                        "MMM d, yyyy 'at' h:mm a"
                      )
                    : "TBD"}
                </Text>
              </View>
            )}

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Flag Issues</Text>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() =>
                  setCompletionData((prev) => ({ ...prev, hasIssues: !prev.hasIssues }))
                }
              >
                <Ionicons
                  name={completionData.hasIssues ? "checkbox" : "square-outline"}
                  size={24}
                  color={glassTheme.colors.primary}
                />
                <Text style={styles.checkboxLabel}>This shift had issues</Text>
              </TouchableOpacity>
              {completionData.hasIssues && (
                <TextInput
                  style={[styles.searchInput, styles.textArea]}
                  placeholder="Describe the issues..."
                  value={completionData.issueDescription}
                  onChangeText={(text) =>
                    setCompletionData((prev) => ({ ...prev, issueDescription: text }))
                  }
                  multiline
                  numberOfLines={3}
                />
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCompleteModal(false)}
                disabled={submittingCompletion}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  completionData.hasIssues && styles.modalButtonDanger,
                ]}
                onPress={handleCompleteShift}
                disabled={submittingCompletion}
              >
                {submittingCompletion ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>
                    {completionData.hasIssues ? "Flag Issues" : "Complete"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  tabView: {
    flex: 1,
  },
  shiftListContent: {
    paddingBottom: TAB_BAR_CONTENT_HEIGHT + 48,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
  },
  filtersContainer: {
    backgroundColor: glassTheme.colors.background.screen,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: glassTheme.border.color,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: glassTheme.radius.pill,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    gap: 6,
    minHeight: 44,
    ...glassTheme.shadows.small,
  },
  filterChipActive: {
    backgroundColor: glassTheme.colors.primary,
    borderColor: glassTheme.colors.primary,
  },
  filterChipLabel: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    fontWeight: "600",
  },
  filterChipLabelActive: {
    color: "#fff",
    fontWeight: "700",
  },
  filterChipBadge: {
    backgroundColor: glassTheme.colors.text.tertiary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 2,
  },
  filterChipBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  filterChipBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  shiftCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
  },
  shiftCardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: glassTheme.radius.large,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    overflow: "hidden",
    ...glassTheme.shadows.medium,
  },
  shiftCardHeader: {
  },
  shiftCardHeaderLeft: {
    gap: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shiftCardLocation: {
    fontSize: 18,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shiftCardDate: {
    fontSize: 15,
    fontWeight: "400",
    color: glassTheme.colors.text.primary,
  },
  shiftCardTime: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    fontWeight: "400",
  },
  shiftCardBadges: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  badgeSuccess: {
    backgroundColor: `${glassTheme.colors.success}20`,
  },
  badgeWarning: {
    backgroundColor: `${glassTheme.colors.warning}20`,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  shiftCardStaff: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: glassTheme.border.color,
  },
  staffingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftCardStaffText: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    marginLeft: 8,
    fontWeight: "500",
  },
  shiftCardActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  swapButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: `${glassTheme.colors.info}20`,
    borderWidth: 1.5,
    borderColor: glassTheme.colors.info,
    minHeight: 44, // Touch-friendly
  },
  swapButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: glassTheme.colors.info,
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: glassTheme.colors.success,
    minHeight: 44, // Touch-friendly
    shadowColor: glassTheme.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  swapRequestsContainer: {
    padding: 16,
  },
  swapRequestsSection: {
    marginBottom: 24,
  },
  swapRequestsSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 12,
  },
  swapRequestCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  swapRequestCardInner: {
    backgroundColor: glassTheme.colors.background.primary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  swapRequestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  swapRequestUser: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  swapRequestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  swapRequestUserInfo: {
    flex: 1,
  },
  swapRequestUserLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: glassTheme.colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  swapRequestUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
  },
  swapRequestStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  swapRequestStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  swapRequestShifts: {
    gap: 12,
    marginBottom: 16,
  },
  swapRequestShiftBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: glassTheme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
  },
  swapRequestShiftBoxEmpty: {
    borderStyle: "dashed",
    backgroundColor: "transparent",
    borderColor: glassTheme.colors.text.tertiary,
  },
  swapRequestShiftLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: glassTheme.colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  swapRequestShiftDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  swapRequestShiftLocation: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  swapRequestShiftTime: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    marginLeft: 8,
    fontWeight: "500",
  },
  swapRequestShiftEmptyText: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  swapRequestMessage: {
    flexDirection: "row",
    marginTop: 12,
    padding: 12,
    backgroundColor: glassTheme.colors.background.tertiary,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: glassTheme.colors.primary,
    gap: 8,
  },
  swapRequestMessageText: {
    flex: 1,
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
  swapRequestActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  swapRequestActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 44,
    gap: 6,
  },
  swapRequestActionButtonPrimary: {
    backgroundColor: glassTheme.colors.primary,
    shadowColor: glassTheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  swapRequestActionButtonDanger: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: glassTheme.colors.danger,
  },
  swapRequestActionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: glassTheme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalContentScroll: {
    paddingBottom: 20,
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
    backgroundColor: glassTheme.colors.background.tertiary,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalShiftInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.text.secondary,
    marginBottom: 4,
    textTransform: "uppercase",
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
    backgroundColor: glassTheme.colors.background.tertiary,
    borderRadius: 8,
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
    backgroundColor: glassTheme.colors.background.primary,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: glassTheme.border.color,
  },
  searchDropdownItemText: {
    fontSize: 14,
    color: glassTheme.colors.text.primary,
  },
  shiftsList: {
    maxHeight: 200,
  },
  shiftOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: glassTheme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
  },
  shiftOptionSelected: {
    backgroundColor: `${glassTheme.colors.primary}20`,
    borderColor: glassTheme.colors.primary,
  },
  shiftOptionContent: {
    flex: 1,
  },
  shiftOptionLocation: {
    fontSize: 14,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 4,
  },
  shiftOptionTime: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
  },
  modalDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: glassTheme.border.color,
  },
  modalDividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    textTransform: "uppercase",
  },
  acceptWithoutProposingBox: {
    padding: 16,
    backgroundColor: `${glassTheme.colors.warning}22`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: glassTheme.colors.warning,
  },
  acceptWithoutProposingText: {
    fontSize: 14,
    color: glassTheme.colors.text.primary,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: glassTheme.colors.text.primary,
  },
  modalActions: {
    marginTop: 20,
    gap: 12,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  modalButtonFullWidth: {
    flex: 1,
    width: "100%",
  },
  modalButtonCancel: {
    backgroundColor: glassTheme.colors.background.primary,
    borderWidth: 1,
    borderColor: glassTheme.colors.text.tertiary,
  },
  modalButtonPrimary: {
    backgroundColor: glassTheme.colors.primary,
  },
  modalButtonDanger: {
    backgroundColor: glassTheme.colors.danger,
  },
  modalButtonAccept: {
    backgroundColor: glassTheme.colors.warning,
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
  modalButtonAcceptText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  modalHelperText: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    fontStyle: "italic",
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    minWidth: 110,
    justifyContent: "center",
  },
  checkInButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  checkOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: glassTheme.colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    minWidth: 110,
    justifyContent: "center",
  },
  checkOutButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default MyShiftsScreen;

