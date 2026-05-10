/**
 * Deep-link handler + invite detail screen.
 *
 * Handles:
 *   Universal Link:  https://app.rosterio.app/invites/{accountId}/{token}
 *   Custom scheme:   rosterio://invites/{accountId}/{token}
 *   Push tap:        same URL in notification data.deepLink
 *   In-app inbox:    navigated to by InboxScreen
 *
 * Auth guard: if not authenticated, bounces to login with redirectTo param.
 * After login, login screen redirects back here.
 *
 * THIS IS THE HIGHEST-RISK SCREEN — test Test #2 (unauthenticated deep link)
 * explicitly before ship.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/context/AuthContext";
import { getInviteByToken, acceptInvite, declineInvite } from "../../../src/services/apiHelper";
import InviteCard from "../../../src/components/InviteCard";
import GlassCard from "../../../src/components/GlassCard";
import glassTheme from "../../../src/theme/glassTheme";
import { toast } from "../../../src/components/Toast";

type InviteStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";

interface InviteData {
  event: {
    name: string;
    startDate: string;
    endDate: string;
    iteration: string;
    location?: string;
  };
  status: InviteStatus;
  expiresAt: string;
  warning?: string;
}

export default function InviteDetailScreen() {
  const { accountId, token } = useLocalSearchParams<{
    accountId: string;
    token: string;
  }>();
  const { state } = useAuth();

  const isAuthenticated = !!(state.isSignedIn && state.selectedAccount);

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  // Auth guard — bounce to login, passing redirectTo so login can bounce back.
  useEffect(() => {
    if (state.isLoading) return;
    if (!isAuthenticated) {
      router.replace({
        pathname: "/(auth)/login",
        params: { redirectTo: `/invites/${accountId}/${token}` },
      });
    }
  }, [state.isLoading, isAuthenticated, accountId, token]);

  const fetchInvite = useCallback(async () => {
    if (!isAuthenticated || !accountId || !token) return;
    setLoading(true);
    setGone(false);
    const result = await getInviteByToken(accountId, token);
    if (result.success && result.data) {
      setInvite(result.data);
    } else if (result.status === 410 || !result.success) {
      setGone(true);
    }
    setLoading(false);
  }, [isAuthenticated, accountId, token]);

  useEffect(() => {
    if (!state.isLoading && isAuthenticated) {
      fetchInvite();
    }
  }, [state.isLoading, isAuthenticated, fetchInvite]);

  const handleAccept = async () => {
    if (!accountId || !token || busy) return;
    setBusy(true);
    const result = await acceptInvite(accountId, token);
    setBusy(false);
    if (result.success || result.status === 410) {
      setResponded("accepted");
      if (result.data?.warning === "event_cancelled") {
        toast.show(
          "You're in — heads up, this event may have changed. The team will reach out.",
          "warning",
          5000
        );
      } else {
        toast.show("You're in! See you there.", "success");
      }
      router.replace("/(app)/inbox");
    } else {
      toast.show(result.message || "Something went wrong. Please try again.", "error");
    }
  };

  const handleDecline = async () => {
    if (!accountId || !token || busy) return;
    setBusy(true);
    const result = await declineInvite(accountId, token);
    setBusy(false);
    if (result.success || result.status === 410) {
      setResponded("declined");
      toast.show("Invite declined.", "default");
      router.replace("/(app)/inbox");
    } else {
      toast.show(result.message || "Something went wrong. Please try again.", "error");
    }
  };

  // Don't render anything while auth state is loading — the effect above will
  // redirect if not authenticated.
  if (state.isLoading || !isAuthenticated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={glassTheme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Back button */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(app)/inbox");
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
            size={24}
            color={glassTheme.colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Invite</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={glassTheme.colors.primary} />
          </View>
        ) : gone ? (
          <GlassCard style={styles.goneCard} shadow="medium">
            <Ionicons
              name="time-outline"
              size={40}
              color={glassTheme.colors.text.tertiary}
              style={styles.goneIcon}
            />
            <Text style={styles.goneTitle}>Invite no longer available</Text>
            <Text style={styles.goneMessage}>
              This invite has expired, been used, or is no longer valid.
            </Text>
            <TouchableOpacity
              style={styles.goInboxButton}
              onPress={() => router.replace("/(app)/inbox")}
              accessibilityRole="button"
              accessibilityLabel="Go to inbox"
            >
              <Text style={styles.goInboxText}>Go to Inbox</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : invite ? (
          <>
            {(invite.status === "accepted" || invite.status === "declined") && (
              <GlassCard style={styles.alreadyRespondedCard} shadow="small">
                <Ionicons
                  name={invite.status === "accepted" ? "checkmark-circle" : "close-circle"}
                  size={18}
                  color={
                    invite.status === "accepted"
                      ? glassTheme.colors.success
                      : glassTheme.colors.text.secondary
                  }
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.alreadyRespondedText}>
                  {invite.status === "accepted"
                    ? "You have already accepted this invite."
                    : "You have already declined this invite."}
                </Text>
              </GlassCard>
            )}
            <InviteCard
              event={invite.event}
              expiresAt={invite.expiresAt}
              onAccept={handleAccept}
              onDecline={handleDecline}
              busy={busy || responded !== null || invite.status !== "pending"}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: glassTheme.colors.background.screen,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: glassTheme.border.color,
  },
  backButton: {
    padding: glassTheme.spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
  },
  navSpacer: {
    minWidth: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: glassTheme.spacing.xl,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  goneCard: {
    marginHorizontal: glassTheme.spacing.lg,
    alignItems: "center",
    paddingVertical: glassTheme.spacing.xxl,
  },
  goneIcon: {
    marginBottom: glassTheme.spacing.md,
  },
  goneTitle: {
    fontSize: 17,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.primary,
    marginBottom: glassTheme.spacing.sm,
    textAlign: "center",
  },
  goneMessage: {
    fontSize: 14,
    fontFamily: glassTheme.typography.fontFamily.regular,
    color: glassTheme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: glassTheme.spacing.xl,
  },
  goInboxButton: {
    paddingHorizontal: glassTheme.spacing.xl,
    paddingVertical: glassTheme.spacing.md,
    backgroundColor: glassTheme.colors.primary,
    borderRadius: glassTheme.radius.medium,
  },
  goInboxText: {
    fontSize: 15,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.inverse,
  },
  alreadyRespondedCard: {
    marginHorizontal: glassTheme.spacing.lg,
    marginBottom: glassTheme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    padding: glassTheme.spacing.md,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  alreadyRespondedText: {
    flex: 1,
    fontSize: 13,
    fontFamily: glassTheme.typography.fontFamily.medium,
    color: glassTheme.colors.text.secondary,
  },
});
