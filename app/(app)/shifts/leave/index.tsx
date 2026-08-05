import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { ColorValue } from 'react-native';
import {
  getMyLeaveBalances,
  listMyLeaveRequests,
  withdrawLeaveRequest,
} from '../../../../src/services/apiHelper';
import { toast } from '../../../../src/components/Toast';
import { GlassView, isLiquidGlassAvailable } from '../../../../src/utils/glassEffect';
import glassTheme from '../../../../src/theme/glassTheme';
import { TAB_BAR_CONTENT_HEIGHT } from '../../../../src/components/LiquidTabBar';

let BlurView: any;
try {
  BlurView = require('expo-blur').BlurView;
} catch (_) {
  BlurView = null;
}

/**
 * My Leave.
 *
 * Shows what the worker has actually accrued and what has happened to each
 * request. Balances are shown in HOURS with the day equivalent as a hint,
 * because that is how they are held: a part-timer's "day" is not 7.6 hours and
 * a leading day figure would misrepresent what they can take.
 */

type LeaveBalance = {
  leaveTypeId: string;
  code: string;
  name: string;
  paid: boolean;
  entitlementModel: string;
  balanceHours: number | null;
  balanceDays: number | null;
  projectedHours: number | null;
  isEstimateOnly: boolean;
  basisUncertain: boolean;
  anniversaryResetsOn?: string;
};

type LeaveRequest = {
  _id: string;
  leaveTypeId?: { name?: string; code?: string };
  leaveTypeCode: string;
  dateFrom: string;
  dateTo: string;
  totalHours: number;
  status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'withdrawn';
  reason?: string;
  decisionNote?: string;
};

const STATUS_COLORS: Record<LeaveRequest['status'], string> = {
  pending: '#FF9F0A',
  approved: '#34C759',
  declined: '#FF3B30',
  cancelled: '#8E8E93',
  withdrawn: '#8E8E93',
};

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: object }) => {
  const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const useBlur = !liquidGlass && Platform.OS === 'ios' && BlurView != null;
  const Container: any = liquidGlass ? GlassView : useBlur ? BlurView : View;
  const props = liquidGlass
    ? { glassEffectStyle: 'regular' }
    : useBlur
    ? { intensity: 50, tint: 'light' }
    : {};

  return (
    <Container {...props} style={[styles.glassCard, !useBlur && styles.glassCardFallback, style]}>
      <View style={styles.specular} pointerEvents="none" />
      {children}
    </Container>
  );
};

const BalanceCard = ({ balance }: { balance: LeaveBalance }) => (
  <GlassCard style={styles.balanceCard}>
    <Text style={styles.balanceName} numberOfLines={1}>
      {balance.name}
    </Text>
    <Text style={styles.balanceHours}>
      {balance.balanceHours !== null ? `${balance.balanceHours.toFixed(1)}h` : '—'}
    </Text>
    {balance.balanceDays !== null && (
      <Text style={styles.balanceDays}>{balance.balanceDays.toFixed(1)} days</Text>
    )}

    {balance.entitlementModel === 'per_anniversary' && balance.anniversaryResetsOn && (
      <Text style={styles.balanceNote}>
        Resets {format(new Date(balance.anniversaryResetsOn), 'd MMM')}
      </Text>
    )}

    {/* Long service leave rules vary by state and by portable industry scheme,
        so the figure is indicative rather than something to plan around. */}
    {balance.isEstimateOnly && <Text style={styles.balanceEstimate}>Estimate</Text>}
  </GlassCard>
);

const RequestRow = ({
  item,
  onWithdraw,
}: {
  item: LeaveRequest;
  onWithdraw: (item: LeaveRequest) => void;
}) => {
  const from = format(new Date(item.dateFrom), 'EEE d MMM');
  const to = format(new Date(item.dateTo), 'EEE d MMM');
  const sameDay = from === to;
  const color = STATUS_COLORS[item.status];

  return (
    <GlassCard style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.rowDateText}>
          {sameDay ? from : `${from} → ${to}`}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: color + '22', borderColor: color + '55' },
          ]}
        >
          <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.rowMeta}>
        {item.leaveTypeId?.name || 'Leave'} · {item.totalHours?.toFixed(1)}h
      </Text>

      {!!item.decisionNote && (
        <Text style={styles.rowNote} numberOfLines={3}>
          {item.decisionNote}
        </Text>
      )}

      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.withdrawBtn}
          onPress={() => onWithdraw(item)}
          accessibilityRole="button"
          accessibilityLabel="Withdraw request"
        >
          <Text style={styles.withdrawText}>Withdraw</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
};

export default function LeaveScreen() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [accrualStale, setAccrualStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const [balanceRes, requestRes] = await Promise.all([
      getMyLeaveBalances(),
      listMyLeaveRequests(),
    ]);

    if (balanceRes.success === false) {
      setError(balanceRes.message || 'Failed to load leave');
    } else {
      setBalances(balanceRes.data?.balances || []);
      setAccrualStale(Boolean(balanceRes.data?.accrual?.isStale));
    }

    if (requestRes.success !== false) {
      setRequests(Array.isArray(requestRes.data) ? requestRes.data : []);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleWithdraw = useCallback(
    (item: LeaveRequest) => {
      Alert.alert(
        'Withdraw request?',
        'Your manager will no longer see this request.',
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Withdraw',
            style: 'destructive',
            onPress: async () => {
              const res = await withdrawLeaveRequest(item._id);
              if (res.success === false) {
                toast.error(res.message || 'Could not withdraw the request');
              } else {
                toast.success('Request withdrawn');
                loadData();
              }
            },
          },
        ]
      );
    },
    [loadData]
  );

  // Only types with a running balance are worth a tile. Showing a blank tile for
  // compassionate leave would imply a balance that does not exist.
  const balancesWithNumbers = balances.filter((b) => b.balanceHours !== null);

  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.vivid as [ColorValue, ColorValue, ...ColorValue[]]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={26} color={glassTheme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>My Leave</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push('/shifts/leave/new')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Request leave"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color={glassTheme.colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={glassTheme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadData(true)}
                tintColor={glassTheme.colors.primary}
              />
            }
          >
            {/* A stale accrual means the balances below are out of date. Saying
                so is better than showing a confident wrong number. */}
            {accrualStale && (
              <View style={styles.warningBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#8A6100" />
                <Text style={styles.warningText}>
                  Your balances may be out of date. Leave has not accrued
                  recently — check with your manager.
                </Text>
              </View>
            )}

            {balancesWithNumbers.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Balances</Text>
                <View style={styles.balanceGrid}>
                  {balancesWithNumbers.map((balance) => (
                    <BalanceCard key={balance.leaveTypeId} balance={balance} />
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionLabel}>Requests</Text>
            {requests.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Ionicons
                  name="calendar-outline"
                  size={40}
                  color={glassTheme.colors.text.tertiary}
                />
                <Text style={styles.emptyTitle}>No leave requested yet</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/shifts/leave/new')}
                  accessibilityRole="button"
                >
                  <Text style={styles.emptyBtnText}>Request leave</Text>
                </TouchableOpacity>
              </GlassCard>
            ) : (
              requests.map((item) => (
                <RequestRow key={item._id} item={item} onWithdraw={handleWithdraw} />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safeArea: { flex: 1 },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: glassTheme.spacing.lg,
    paddingTop: glassTheme.spacing.sm,
    paddingBottom: glassTheme.spacing.xs,
  },
  backBtn: { padding: 4, marginRight: glassTheme.spacing.sm },
  screenTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.4,
    fontFamily: glassTheme.typography.fontFamily.bold,
  },
  newBtn: { padding: 4 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: glassTheme.spacing.xl,
  },
  errorText: {
    fontSize: 14,
    color: glassTheme.colors.danger,
    textAlign: 'center',
    marginBottom: glassTheme.spacing.md,
  },
  retryBtn: {
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: glassTheme.spacing.xl,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.medium,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  scrollContent: {
    padding: glassTheme.spacing.lg,
    paddingBottom: TAB_BAR_CONTENT_HEIGHT + 48,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: glassTheme.spacing.sm,
    backgroundColor: '#FFF6E0',
    borderColor: '#F0D08A',
    borderWidth: 1,
    borderRadius: glassTheme.radius.medium,
    padding: glassTheme.spacing.md,
    marginBottom: glassTheme.spacing.lg,
  },
  warningText: { flex: 1, fontSize: 13, color: '#8A6100', lineHeight: 18 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: glassTheme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: glassTheme.spacing.sm,
    marginTop: glassTheme.spacing.sm,
  },

  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.md,
    marginBottom: glassTheme.spacing.md,
  },
  balanceCard: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: glassTheme.spacing.lg,
  },
  balanceName: {
    fontSize: 12,
    color: glassTheme.colors.text.secondary,
    marginBottom: 4,
  },
  balanceHours: {
    fontSize: 26,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    fontFamily: glassTheme.typography.fontFamily.bold,
  },
  balanceDays: { fontSize: 12, color: glassTheme.colors.text.tertiary },
  balanceNote: {
    fontSize: 11,
    color: glassTheme.colors.text.tertiary,
    marginTop: 4,
  },
  balanceEstimate: {
    fontSize: 11,
    color: '#8A6100',
    marginTop: 4,
    fontWeight: '600',
  },

  glassCard: {
    borderRadius: glassTheme.radius.large,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.09)',
    backgroundColor: '#FFFFFF',
    ...glassTheme.shadows.medium,
  },
  glassCardFallback: { backgroundColor: 'rgba(255,255,255,0.96)' },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: glassTheme.glass.light.specular,
    zIndex: 1,
  },

  rowCard: { marginBottom: glassTheme.spacing.md, padding: glassTheme.spacing.lg },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowDateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },
  rowMeta: { fontSize: 13, color: glassTheme.colors.text.secondary },
  rowNote: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    marginTop: glassTheme.spacing.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  withdrawBtn: { alignSelf: 'flex-start', marginTop: glassTheme.spacing.sm },
  withdrawText: {
    fontSize: 13,
    fontWeight: '600',
    color: glassTheme.colors.danger,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  emptyCard: { padding: glassTheme.spacing.xl, alignItems: 'center' },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
    marginTop: glassTheme.spacing.sm,
    marginBottom: glassTheme.spacing.md,
  },
  emptyBtn: {
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: glassTheme.spacing.xl,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.medium,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
