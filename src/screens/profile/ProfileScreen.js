import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { formatRole } from "../../utils/roleFormatter";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import glassTheme from "../../theme/glassTheme";
import { TAB_BAR_CONTENT_HEIGHT } from "../../components/LiquidTabBar";

let BlurView;
try { BlurView = require("expo-blur").BlurView; } catch (e) { BlurView = null; }

// ── Info row inside a glass card ──────────────────────────────
const InfoRow = ({ label, value, icon, last = false }) => (
  <View style={[styles.infoRow, last && styles.infoRowLast]}>
    <View style={styles.infoRowLeft}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={16} color={glassTheme.colors.text.secondary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

// ── Glass card wrapper ─────────────────────────────────────────
const GlassSection = ({ children, style }) => {
  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const useBlur = !liquidGlass && Platform.OS === "ios" && BlurView != null;
  const Container = liquidGlass ? GlassView : useBlur ? BlurView : View;
  const props = liquidGlass
    ? { glassEffectStyle: "regular" }
    : useBlur
    ? { intensity: 50, tint: "light" }
    : {};

  return (
    <Container
      {...props}
      style={[styles.glassCard, !useBlur && styles.glassCardFallback, style]}
    >
      <View style={styles.specular} pointerEvents="none" />
      {children}
    </Container>
  );
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { state, signOut } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", onPress: signOut, style: "destructive" },
    ]);
  };

  const user = state.user;
  const initials = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.vivid}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* ── Persistent header — always visible, never scrolls away ── */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Profile</Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.headerLogoutBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={24} color={glassTheme.colors.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile header glass card ───────── */}
          <View style={styles.headerSection}>
            <GlassSection style={styles.profileCard}>
              <View style={styles.avatarRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              </View>
              <Text style={styles.profileName}>{user?.name || "User"}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{formatRole(user?.role)}</Text>
              </View>
            </GlassSection>
          </View>

          {/* ── Account Information ─────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <GlassSection>
              <InfoRow label="Email" value={user?.email || "—"} icon="mail-outline" />
              <InfoRow label="Role" value={formatRole(user?.role)} icon="shield-outline" />
              <InfoRow
                label="Status"
                value={user?.isActive === false ? "Inactive" : "Active"}
                icon="person-circle-outline"
                last
              />
            </GlassSection>
          </View>

          {/* ── App Information ─────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>App</Text>
            <GlassSection>
              <InfoRow label="App" value="Rosterio Mobile" icon="briefcase-outline" />
              <InfoRow label="Version" value="1.0.0" icon="information-circle-outline" last />
            </GlassSection>
          </View>

          {/* ── Actions ─────────────────────────── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate("edit-profile")}
              activeOpacity={0.75}
            >
              <Ionicons name="create-outline" size={18} color={glassTheme.colors.primary} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={glassTheme.colors.text.tertiary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          </View>

          <View style={[styles.section, { marginTop: 4 }]}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="white" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

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
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: TAB_BAR_CONTENT_HEIGHT + 48 },

  // Glass card base
  glassCard: {
    borderRadius: glassTheme.radius.large,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    backgroundColor: "#FFFFFF",
    ...glassTheme.shadows.medium,
  },
  glassCardFallback: {
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  specular: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: glassTheme.glass.light.specular,
    zIndex: 1,
  },

  // Screen-level header row (always visible)
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
  },
  headerLogoutBtn: {
    padding: 4,
  },

  // Header section
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileCard: {
    alignItems: "center",
    padding: 28,
  },
  avatarRow: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: glassTheme.colors.wash.black,
    justifyContent: "center",
    alignItems: "center",
    ...glassTheme.shadows.large,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "700",
    color: glassTheme.colors.primary,
    letterSpacing: -0.5,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    marginBottom: 12,
  },
  rolePill: {
    backgroundColor: `${glassTheme.colors.primary}22`,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: glassTheme.radius.pill,
    borderWidth: 1,
    borderColor: `${glassTheme.colors.primary}55`,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.primary,
    letterSpacing: 0.2,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: glassTheme.colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: glassTheme.border.color,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: glassTheme.colors.wash.black,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: glassTheme.colors.text.primary,
  },
  infoValue: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    fontWeight: "400",
    maxWidth: "45%",
    textAlign: "right",
  },

  // Buttons
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: glassTheme.radius.large,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.09)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    ...glassTheme.shadows.small,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: glassTheme.colors.primary,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glassTheme.colors.danger,
    borderRadius: glassTheme.radius.large,
    paddingVertical: 16,
    gap: 8,
    ...glassTheme.shadows.medium,
  },
  signOutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  bottomPad: { height: 24 },
});

export default ProfileScreen;
