import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { ColorValue } from 'react-native';
import { listMyUnavailability } from '../../../../src/services/apiHelper';
import { GlassView, isLiquidGlassAvailable } from '../../../../src/utils/glassEffect';
import glassTheme from '../../../../src/theme/glassTheme';
import { TAB_BAR_CONTENT_HEIGHT } from '../../../../src/components/LiquidTabBar';

let BlurView: any;
try {
  BlurView = require('expo-blur').BlurView;
} catch (_) {
  BlurView = null;
}

type UnavailabilityRecord = {
  _id: string;
  dateFrom: string;
  dateTo: string;
  category: 'annual_leave' | 'sick' | 'personal' | 'unavailable';
  notes?: string;
};

const CATEGORY_LABELS: Record<UnavailabilityRecord['category'], string> = {
  annual_leave: 'Annual Leave',
  sick: 'Sick',
  personal: 'Personal',
  unavailable: 'Unavailable',
};

const CATEGORY_COLORS: Record<UnavailabilityRecord['category'], string> = {
  annual_leave: '#5856D6',
  sick: '#FF9F0A',
  personal: '#AF52DE',
  unavailable: '#8E8E93',
};

const CategoryBadge = ({ category }: { category: UnavailabilityRecord['category'] }) => (
  <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[category] + '22', borderColor: CATEGORY_COLORS[category] + '55' }]}>
    <Text style={[styles.badgeText, { color: CATEGORY_COLORS[category] }]}>
      {CATEGORY_LABELS[category]}
    </Text>
  </View>
);

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
    <Container
      {...props}
      style={[styles.glassCard, !useBlur && styles.glassCardFallback, style]}
    >
      <View style={styles.specular} pointerEvents="none" />
      {children}
    </Container>
  );
};

const UnavailabilityRow = ({ item, onPress }: { item: UnavailabilityRecord; onPress: () => void }) => {
  const from = format(new Date(item.dateFrom), 'EEE d MMM');
  const to = format(new Date(item.dateTo), 'EEE d MMM');
  const sameDay = from === to;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`${CATEGORY_LABELS[item.category]}, ${from}${sameDay ? '' : ' to ' + to}`}
      accessibilityRole="button"
    >
      <GlassCard style={styles.rowCard}>
        <View style={styles.rowTop}>
          <View style={styles.rowDateRange}>
            <Text style={styles.rowDateText}>{from}</Text>
            {!sameDay && (
              <>
                <Ionicons name="arrow-forward" size={12} color={glassTheme.colors.text.tertiary} style={styles.rowArrow} />
                <Text style={styles.rowDateText}>{to}</Text>
              </>
            )}
          </View>
          <CategoryBadge category={item.category} />
        </View>
        {!!item.notes && (
          <Text style={styles.rowNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
        <Ionicons
          name="chevron-forward"
          size={16}
          color={glassTheme.colors.text.tertiary}
          style={styles.rowChevron}
        />
      </GlassCard>
    </TouchableOpacity>
  );
};

export default function UnavailabilityListScreen() {
  const [items, setItems] = useState<UnavailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const result = await listMyUnavailability();

    if (result.success === false) {
      setError(result.message || 'Failed to load unavailability');
    } else {
      const records: UnavailabilityRecord[] = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];
      setItems(records);
    }

    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, []);

  // Reload whenever the screen comes back into focus (e.g., after create/edit/delete)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
          <Text style={styles.screenTitle}>My Unavailability</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push('/shifts/unavailability/new')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Log new unavailability"
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
          <FlatList
            data={items}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) =>
              <UnavailabilityRow
                item={item}
                onPress={() => router.push(`/shifts/unavailability/${item._id}`)}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              items.length === 0 && styles.listContentEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadData(true)}
                tintColor={glassTheme.colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={glassTheme.colors.text.tertiary} />
                <Text style={styles.emptyTitle}>Nothing logged yet</Text>
                <Text style={styles.emptySubtitle}>Add your first unavailability</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/shifts/unavailability/new')}
                  accessibilityRole="button"
                >
                  <Text style={styles.emptyBtnText}>+ New</Text>
                </TouchableOpacity>
              </View>
            }
          />
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: glassTheme.spacing.xl },
  errorText: { fontSize: 14, color: glassTheme.colors.danger, textAlign: 'center', marginBottom: glassTheme.spacing.md },
  retryBtn: {
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: glassTheme.spacing.xl,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.medium,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  listContent: { padding: glassTheme.spacing.lg, paddingBottom: TAB_BAR_CONTENT_HEIGHT + 48 },
  listContentEmpty: { flex: 1, justifyContent: 'center' },

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

  rowCard: {
    marginBottom: glassTheme.spacing.md,
    padding: glassTheme.spacing.lg,
    position: 'relative',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowDateRange: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  rowDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },
  rowArrow: { marginHorizontal: glassTheme.spacing.xs },
  rowNotes: {
    fontSize: 13,
    color: glassTheme.colors.text.secondary,
    marginTop: glassTheme.spacing.xs,
    lineHeight: 18,
    paddingRight: glassTheme.spacing.lg,
  },
  rowChevron: { position: 'absolute', right: glassTheme.spacing.lg, top: '50%' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: glassTheme.radius.pill,
    borderWidth: 1,
    marginLeft: glassTheme.spacing.sm,
  },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },

  emptyContainer: { alignItems: 'center', paddingVertical: glassTheme.spacing.xl },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    marginTop: glassTheme.spacing.lg,
    marginBottom: glassTheme.spacing.xs,
    fontFamily: glassTheme.typography.fontFamily.bold,
  },
  emptySubtitle: { fontSize: 14, color: glassTheme.colors.text.secondary, marginBottom: glassTheme.spacing.xl },
  emptyBtn: {
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: glassTheme.spacing.xl,
    paddingVertical: glassTheme.spacing.md,
    borderRadius: glassTheme.radius.medium,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
