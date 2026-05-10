/**
 * InviteCard — displays an event invite with Accept / Decline actions.
 *
 * Props:
 *   event      — event metadata (name, startDate, endDate, iteration, location?)
 *   expiresAt  — Date when the invite expires
 *   onAccept   — callback when user taps "I'm in"
 *   onDecline  — callback when user taps "No thanks"
 *   busy?      — disables both buttons while an API call is in flight
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import GlassCard from "./GlassCard";
import glassTheme from "../theme/glassTheme";

export interface InviteEvent {
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  iteration: string;
  location?: string;
}

export interface InviteCardProps {
  event: InviteEvent;
  expiresAt: string | Date;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
}

const InviteCard: React.FC<InviteCardProps> = ({
  event,
  expiresAt,
  onAccept,
  onDecline,
  busy = false,
}) => {
  const expiryDate = new Date(expiresAt);
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const hoursUntilExpiry = differenceInHours(expiryDate, new Date());
  const showCountdown = hoursUntilExpiry >= 0 && hoursUntilExpiry < 24;

  // Countdown timer — refreshes every minute when < 24h remain
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!showCountdown) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [showCountdown]);

  const formatDateRange = () => {
    const start = format(startDate, "d MMM yyyy");
    const end = format(endDate, "d MMM yyyy");
    if (start === end) return start;
    return `${start} – ${end}`;
  };

  return (
    <GlassCard style={styles.card} shadow="large" padding={0}>
      {/* Header strip */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="calendar" size={20} color={glassTheme.colors.text.inverse} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.inviteLabel} numberOfLines={1}>
            You're invited
          </Text>
          <Text style={styles.iterationLabel} numberOfLines={1}>
            {event.iteration}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.eventName} numberOfLines={2}>
          {event.name}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={glassTheme.colors.text.secondary}
            style={styles.metaIcon}
          />
          <Text style={styles.metaText}>{formatDateRange()}</Text>
        </View>

        {event.location ? (
          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={glassTheme.colors.text.secondary}
              style={styles.metaIcon}
            />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        ) : null}

        {/* Expiry notice */}
        <View style={[styles.expiryRow, showCountdown && styles.expiryRowUrgent]}>
          <Ionicons
            name={showCountdown ? "time" : "time-outline"}
            size={13}
            color={
              showCountdown
                ? glassTheme.colors.warning
                : glassTheme.colors.text.tertiary
            }
            style={styles.metaIcon}
          />
          <Text
            style={[
              styles.expiryText,
              showCountdown && styles.expiryTextUrgent,
            ]}
          >
            {showCountdown
              ? `Expires ${formatDistanceToNow(expiryDate, { addSuffix: true })}`
              : `Offer expires ${format(expiryDate, "d MMM yyyy")}`}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actions}>
        {/* Decline — subtle */}
        <TouchableOpacity
          style={[styles.declineButton, busy && styles.buttonDisabled]}
          onPress={onDecline}
          disabled={busy}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Decline invite"
          accessibilityState={{ disabled: busy }}
        >
          <Text style={styles.declineText}>No thanks</Text>
        </TouchableOpacity>

        {/* Divider between buttons */}
        <View style={styles.buttonDivider} />

        {/* Accept — primary */}
        <TouchableOpacity
          style={[styles.acceptButton, busy && styles.buttonDisabled]}
          onPress={onAccept}
          disabled={busy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Accept invite"
          accessibilityState={{ disabled: busy }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={glassTheme.colors.text.inverse} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={glassTheme.colors.text.inverse}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.acceptText}>I'm in</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: glassTheme.spacing.lg,
    marginVertical: glassTheme.spacing.sm,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: glassTheme.spacing.lg,
    paddingVertical: glassTheme.spacing.md,
    gap: glassTheme.spacing.sm,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  inviteLabel: {
    fontSize: 12,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  iterationLabel: {
    fontSize: 13,
    fontFamily: glassTheme.typography.fontFamily.medium,
    color: glassTheme.colors.text.inverse,
    marginTop: 1,
  },
  body: {
    paddingHorizontal: glassTheme.spacing.lg,
    paddingTop: glassTheme.spacing.lg,
    paddingBottom: glassTheme.spacing.md,
    gap: glassTheme.spacing.xs,
  },
  eventName: {
    fontSize: 20,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.4,
    marginBottom: glassTheme.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 14,
    fontFamily: glassTheme.typography.fontFamily.regular,
    color: glassTheme.colors.text.secondary,
    flex: 1,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: glassTheme.spacing.sm,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: glassTheme.radius.small,
    paddingHorizontal: glassTheme.spacing.sm,
    paddingVertical: 6,
  },
  expiryRowUrgent: {
    backgroundColor: "rgba(255,159,10,0.08)",
  },
  expiryText: {
    fontSize: 12,
    fontFamily: glassTheme.typography.fontFamily.medium,
    color: glassTheme.colors.text.tertiary,
  },
  expiryTextUrgent: {
    color: glassTheme.colors.warning,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: glassTheme.spacing.lg,
  },
  actions: {
    flexDirection: "row",
    alignItems: "stretch",
    height: 52,
  },
  declineButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: glassTheme.spacing.md,
  },
  buttonDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 10,
  },
  acceptButton: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glassTheme.colors.primary,
    margin: 8,
    borderRadius: glassTheme.radius.medium,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  declineText: {
    fontSize: 14,
    fontFamily: glassTheme.typography.fontFamily.medium,
    color: glassTheme.colors.text.secondary,
  },
  acceptText: {
    fontSize: 15,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
    color: glassTheme.colors.text.inverse,
  },
});

export default InviteCard;
