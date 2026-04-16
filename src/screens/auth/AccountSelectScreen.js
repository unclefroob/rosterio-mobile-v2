import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RosterioMark from "../../components/RosterioMark";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { formatRole } from "../../utils/roleFormatter";
import { GlassView, isLiquidGlassAvailable } from "../../utils/glassEffect";
import glassTheme from "../../theme/glassTheme";

let BlurView;
try { BlurView = require("expo-blur").BlurView; } catch (e) { BlurView = null; }

const AccountSelectScreen = () => {
  const { state, selectAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const useBlur = !liquidGlass && Platform.OS === "ios" && BlurView != null;
  const CardComp = liquidGlass ? GlassView : useBlur ? BlurView : View;
  const cardProps = liquidGlass
    ? { glassEffectStyle: "regular" }
    : useBlur
    ? { intensity: 45, tint: "light" }
    : {};

  const handleSelectAccount = async () => {
    if (!selectedAccountId) {
      Alert.alert("Select Account", "Please select an account to continue.");
      return;
    }
    setLoading(true);
    const result = await selectAccount(selectedAccountId);
    setLoading(false);
    if (!result.success) {
      Alert.alert("Error", result.error || "Could not load account.");
    }
  };

  const accounts = state.user?.accounts || [];

  const renderAccountCard = ({ item }) => {
    const id = item.id || item._id;
    const isSelected = selectedAccountId === id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedAccountId(id)}
        activeOpacity={0.72}
        style={styles.cardTouchable}
      >
        <CardComp
          {...cardProps}
          style={[
            styles.accountCard,
            !useBlur && styles.accountCardFallback,
            isSelected && styles.accountCardSelected,
          ]}
        >
          <View style={styles.specular} pointerEvents="none" />
          <View style={[styles.accountIconCircle, isSelected && styles.accountIconCircleSelected]}>
            <Ionicons
              name="business"
              size={26}
              color={isSelected ? glassTheme.colors.text.inverse : glassTheme.colors.primary}
            />
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, isSelected && styles.accountNameSelected]}>
              {item.name}
            </Text>
            <Text style={styles.accountRole}>{formatRole(item.role)}</Text>
          </View>
          {isSelected && (
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={14} color="white" />
            </View>
          )}
        </CardComp>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.vivid}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <RosterioMark size={28} color={glassTheme.colors.primary} />
          </View>
          <Text style={styles.title}>Select Account</Text>
          <Text style={styles.subtitle}>Choose which account to manage</Text>
        </View>

        {accounts.length > 0 ? (
          <>
            <FlatList
              data={accounts}
              renderItem={renderAccountCard}
              keyExtractor={(item) => item.id || item._id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  (!selectedAccountId || loading) && styles.continueButtonDisabled,
                ]}
                onPress={handleSelectAccount}
                disabled={loading || !selectedAccountId}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="warning-outline" size={36} color={glassTheme.colors.warning} />
            </View>
            <Text style={styles.emptyTitle}>No Accounts Found</Text>
            <Text style={styles.emptySubtitle}>
              Please contact your administrator to get access to an account.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 28,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: glassTheme.colors.wash.black,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...glassTheme.shadows.medium,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: glassTheme.colors.text.secondary,
    fontWeight: "400",
  },

  // Account cards
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },

  cardTouchable: {
    marginBottom: 12,
    borderRadius: glassTheme.radius.large,
    overflow: "hidden",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: glassTheme.radius.large,
    borderWidth: 0.5,
    borderColor: glassTheme.glass.light.border,
    padding: 16,
    overflow: "hidden",
    ...glassTheme.shadows.small,
  },
  accountCardFallback: {
    backgroundColor: "rgba(255, 255, 255, 0.90)",
  },
  accountCardSelected: {
    borderColor: glassTheme.colors.primary,
    borderWidth: 1.5,
  },
  specular: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: glassTheme.glass.light.specular,
    zIndex: 1,
  },
  accountIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: glassTheme.colors.wash.black,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  accountIconCircleSelected: {
    backgroundColor: glassTheme.colors.primary,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    color: glassTheme.colors.text.primary,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  accountNameSelected: {
    color: glassTheme.colors.primary,
  },
  accountRole: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    fontWeight: "500",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: glassTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Footer / CTA
  footer: {
    paddingVertical: 20,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glassTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: glassTheme.radius.large,
    ...glassTheme.shadows.medium,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: `${glassTheme.colors.warning}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default AccountSelectScreen;
