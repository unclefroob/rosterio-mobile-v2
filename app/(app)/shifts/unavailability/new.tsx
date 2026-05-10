import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { ColorValue } from 'react-native';
import { createUnavailability } from '../../../../src/services/apiHelper';
import { DateField } from '../../../../src/components/DateField';
import { toast } from '../../../../src/components/Toast';
import glassTheme from '../../../../src/theme/glassTheme';

type Category = 'annual_leave' | 'sick' | 'personal' | 'unavailable';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'annual_leave', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick' },
  { value: 'personal', label: 'Personal' },
  { value: 'unavailable', label: 'Unavailable' },
];

const CATEGORY_COLORS: Record<Category, string> = {
  annual_leave: '#5856D6',
  sick: '#FF9F0A',
  personal: '#AF52DE',
  unavailable: '#8E8E93',
};

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function NewUnavailabilityScreen() {
  const today = todayMidnight();

  const [dateFrom, setDateFrom] = useState<Date>(today);
  const [dateTo, setDateTo] = useState<Date>(today);
  const [category, setCategory] = useState<Category>('annual_leave');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (dateTo < dateFrom) {
      return 'End date must be on or after the start date.';
    }
    const now = todayMidnight();
    if (dateFrom < now) {
      return 'Start date cannot be in the past.';
    }
    if (notes.length > 500) {
      return 'Notes must be 500 characters or fewer.';
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Validation Error', err);
      return;
    }

    setSaving(true);
    const body = {
      dateFrom: format(dateFrom, 'yyyy-MM-dd'),
      dateTo: format(dateTo, 'yyyy-MM-dd'),
      category,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    const result = await createUnavailability(body);
    setSaving(false);

    if (result.success === false) {
      Alert.alert('Error', result.message || 'Failed to save unavailability');
      return;
    }

    toast.success('Unavailability logged');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/shifts/unavailability');
    }
  };

  return (
    <LinearGradient
      colors={glassTheme.colors.gradients.vivid as [ColorValue, ColorValue, ...ColorValue[]]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.screenHeader}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={26} color={glassTheme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Log Unavailability</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Date From */}
            <Text style={styles.sectionLabel}>Date Range</Text>
            <View style={styles.card}>
              <DateField
                label="Start Date"
                value={dateFrom}
                minimumDate={today}
                onChange={(d) => {
                  setDateFrom(d);
                  if (d > dateTo) setDateTo(d);
                }}
              />
              <View style={styles.divider} />
              <DateField
                label="End Date"
                value={dateTo}
                minimumDate={dateFrom}
                onChange={setDateTo}
              />
            </View>

            {/* Category */}
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.card}>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  const selected = category === cat.value;
                  const color = CATEGORY_COLORS[cat.value];
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        selected && {
                          backgroundColor: color + '22',
                          borderColor: color,
                        },
                      ]}
                      onPress={() => setCategory(cat.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={cat.label}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && { color, fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.sectionLabel}>Notes (optional)</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={(t) => setNotes(t.slice(0, 500))}
                placeholder="Add a note..."
                placeholderTextColor={glassTheme.colors.text.placeholder}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel="Notes"
              />
              <Text style={styles.charCounter}>{notes.length}/500</Text>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save unavailability"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: glassTheme.spacing.lg,
    paddingTop: glassTheme.spacing.sm,
    paddingBottom: glassTheme.spacing.xs,
  },
  backBtn: { padding: 4 },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.3,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },
  headerRight: { width: 34 },

  scroll: { flex: 1 },
  scrollContent: { padding: glassTheme.spacing.lg, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: glassTheme.colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: glassTheme.spacing.sm,
    marginLeft: 4,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: glassTheme.radius.large,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.09)',
    padding: glassTheme.spacing.lg,
    marginBottom: glassTheme.spacing.xl,
    ...glassTheme.shadows.small,
  },

  divider: {
    height: 1,
    backgroundColor: glassTheme.border.color,
    marginVertical: glassTheme.spacing.md,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.pill,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
    backgroundColor: glassTheme.colors.background.tertiary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: glassTheme.colors.text.secondary,
    fontFamily: glassTheme.typography.fontFamily.medium,
  },

  notesInput: {
    fontSize: 15,
    color: glassTheme.colors.text.primary,
    minHeight: 96,
    fontFamily: glassTheme.typography.fontFamily.regular,
  },
  charCounter: {
    fontSize: 11,
    color: glassTheme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: glassTheme.spacing.xs,
  },

  saveBtn: {
    backgroundColor: glassTheme.colors.primary,
    borderRadius: glassTheme.radius.large,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: glassTheme.spacing.sm,
    ...glassTheme.shadows.medium,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },
});
