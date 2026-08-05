import React, { useState, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { ColorValue } from 'react-native';
import {
  getUnavailability,
  updateUnavailability,
  deleteUnavailability,
} from '../../../../src/services/apiHelper';
import { DateField } from '../../../../src/components/DateField';
import { toast } from '../../../../src/components/Toast';
import glassTheme from '../../../../src/theme/glassTheme';

/**
 * Editing an availability record.
 *
 * The category picker is gone: `unavailable` is the only category this screen
 * writes. Records created by older app builds may still carry a leave category,
 * so the state keeps the wider type and the save preserves whatever came back
 * rather than silently reclassifying someone's historic leave.
 */
type Category = 'annual_leave' | 'sick' | 'personal' | 'unavailable';

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function EditUnavailabilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = todayMidnight();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [dateFrom, setDateFrom] = useState<Date>(today);
  const [dateTo, setDateTo] = useState<Date>(today);
  const [category, setCategory] = useState<Category>('unavailable');
  const [notes, setNotes] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      const result = await getUnavailability(id as string);

      if (result.success === false || !result.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const record = result.data;
      setDateFrom(new Date(record.dateFrom));
      setDateTo(new Date(record.dateTo));
      // Loaded but not editable. Keeping the record's own category means
      // editing the notes on a pre-split record does not silently reclassify
      // someone's historic leave as plain availability.
      setCategory(record.category as Category);
      setNotes(record.notes || '');
      setLoading(false);
    };

    fetchRecord();
  }, [id]);

  const validate = (): string | null => {
    if (dateTo < dateFrom) {
      return 'End date must be on or after the start date.';
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
      notes: notes.trim(),
    };

    const result = await updateUnavailability(id, body);
    setSaving(false);

    if (result.success === false) {
      Alert.alert('Error', result.message || 'Failed to update unavailability');
      return;
    }

    toast.success('Unavailability updated');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/shifts/unavailability');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Unavailability',
      'Are you sure you want to delete this record? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const result = await deleteUnavailability(id);
            setDeleting(false);

            if (result.success === false) {
              Alert.alert('Error', result.message || 'Failed to delete unavailability');
              return;
            }

            toast.success('Unavailability deleted');
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/shifts/unavailability');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={glassTheme.colors.gradients.vivid as [ColorValue, ColorValue, ...ColorValue[]]} style={styles.bg}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={glassTheme.colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  if (notFound) {
    return (
      <LinearGradient colors={glassTheme.colors.gradients.vivid as [ColorValue, ColorValue, ...ColorValue[]]} style={styles.bg}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.center}>
            <Text style={styles.errorText}>Record not found.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
              <Text style={styles.retryText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={26} color={glassTheme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Edit Unavailability</Text>
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

            {/* Leave has its own screen, with a balance and an approval
                step. Editing a historic leave record here would leave it
                unapproved and undeducted. */}
            <TouchableOpacity
              style={styles.leaveHint}
              onPress={() => router.replace('/shifts/leave')}
              accessibilityRole="button"
              accessibilityLabel="Go to leave"
            >
              <Ionicons name="airplane-outline" size={18} color={glassTheme.colors.primary} />
              <Text style={styles.leaveHintText}>
                Annual, sick and other leave now live on the Leave screen.
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={glassTheme.colors.text.tertiary}
              />
            </TouchableOpacity>

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
              disabled={saving || deleting}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.saveBtnDisabled]}
              onPress={handleDelete}
              disabled={saving || deleting}
              accessibilityRole="button"
              accessibilityLabel="Delete unavailability"
            >
              {deleting ? (
                <ActivityIndicator size="small" color={glassTheme.colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color={glassTheme.colors.danger} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  leaveHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
    backgroundColor: '#EEF3F8',
    borderRadius: glassTheme.radius.medium,
    padding: glassTheme.spacing.md,
    marginTop: glassTheme.spacing.md,
  },
  leaveHintText: { flex: 1, fontSize: 12, color: '#3A4A5A', lineHeight: 17 },

  bg: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: glassTheme.spacing.xl },

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
    marginBottom: glassTheme.spacing.md,
    ...glassTheme.shadows.medium,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.large,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: glassTheme.colors.danger + '55',
    backgroundColor: glassTheme.colors.danger + '10',
  },
  deleteBtnText: {
    color: glassTheme.colors.danger,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },

  errorText: {
    fontSize: 15,
    color: glassTheme.colors.danger,
    marginBottom: glassTheme.spacing.lg,
  },
  retryBtn: {
    backgroundColor: glassTheme.colors.primary,
    paddingHorizontal: glassTheme.spacing.xl,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.medium,
  },
  retryText: { color: '#fff', fontWeight: '600' },
});
