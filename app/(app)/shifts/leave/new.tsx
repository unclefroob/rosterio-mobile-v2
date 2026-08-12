import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import {
  getLeaveTypes,
  previewLeaveRequest,
  createLeaveRequest,
} from '../../../../src/services/apiHelper';
import { DateField } from '../../../../src/components/DateField';
import { toast } from '../../../../src/components/Toast';
import glassTheme from '../../../../src/theme/glassTheme';

/**
 * Request leave.
 *
 * Two things this screen does that a plain date-range form does not:
 *
 * 1. The leave types come from the server, not a hardcoded list, so an employer
 *    adding a type under their agreement does not need an app release.
 * 2. It previews the actual hours before submitting. A five-day range is not
 *    five days of leave if a public holiday falls in it (which is not deducted
 *    at all under the NES) or if the worker does not work every weekday.
 */

type LeaveType = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  paid: boolean;
  requiresEvidence: boolean;
  confidential: boolean;
};

type PreviewDay = {
  date: string;
  hours: number;
  reason?: 'public_holiday' | 'non_working_day' | 'no_roster';
};

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * FW Act s67(3)'s three cases, in the worker's words.
 *
 * The value is what the Act keys on and the label is what somebody requesting
 * leave would recognise. Paired here rather than mapped at two call sites so a
 * wording change cannot drift from the value it sends.
 */
const PARENTAL_KINDS: Array<{
  value: 'birth_before' | 'birth_after' | 'adoption';
  label: string;
}> = [
  { value: 'birth_before', label: 'Starting before the birth' },
  { value: 'birth_after', label: 'Starting after the birth' },
  { value: 'adoption', label: 'For an adoption' },
];

export default function NewLeaveRequestScreen() {
  const today = todayMidnight();

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState<Date>(today);
  const [dateTo, setDateTo] = useState<Date>(today);
  const [reason, setReason] = useState('');

  const [preview, setPreview] = useState<{
    days: PreviewDay[];
    totalHours: number;
    publicHolidaysExcluded: string[];
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedType = types.find((t) => t._id === selectedTypeId) || null;

  /*
   * FW Act Division 5, asked only when the chosen type is parental leave.
   *
   * `parentalKind` is not a formality. s67(3) fixes the date the twelve months
   * of qualifying service is counted to, and for leave starting BEFORE the
   * birth that date is the expected date of birth — later than the leave's
   * start and often later than today. Somebody eleven months into a job with a
   * baby due in two months IS entitled, and a system counting to the day they
   * asked would tell them they are not.
   */
  const isParental = selectedType?.code === 'parental';
  const [parentalKind, setParentalKind] =
    useState<'birth_before' | 'birth_after' | 'adoption'>('birth_before');
  const [expectedDob, setExpectedDob] = useState<Date | null>(null);
  /*
   * Null on purpose. An unticked checkbox cannot be told apart from a question
   * nobody read, and s70(b) is a limb of the entitlement — so the answer is
   * required rather than defaulted, and Send stays disabled until it is given.
   */
  const [responsibleForCare, setResponsibleForCare] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const res = await getLeaveTypes();
      if (res.success === false) {
        toast.error(res.message || 'Could not load leave types');
      } else {
        const list: LeaveType[] = Array.isArray(res.data) ? res.data : [];
        setTypes(list);
        if (list.length > 0) setSelectedTypeId(list[0]._id);
      }
      setTypesLoading(false);
    })();
  }, []);

  const refreshPreview = useCallback(async () => {
    if (dateTo < dateFrom) {
      setPreview(null);
      return;
    }
    setPreviewing(true);
    const res = await previewLeaveRequest({
      dateFrom: toISODate(dateFrom),
      dateTo: toISODate(dateTo),
    });
    if (res.success === false) setPreview(null);
    else setPreview(res.data);
    setPreviewing(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const handleSubmit = async () => {
    if (!selectedTypeId) {
      toast.error('Choose a leave type');
      return;
    }
    if (dateTo < dateFrom) {
      toast.error('The end date must be on or after the start date');
      return;
    }
    if (preview && preview.totalHours <= 0) {
      toast.error(
        'That range has no working hours in it. Check the dates, or ask your manager to set your ordinary hours.'
      );
      return;
    }
    // s70(b) is a limb of the entitlement, so an unanswered question here would
    // land on the manager as a gap rather than as a decision.
    if (isParental && responsibleForCare === null) {
      toast.error(
        'Say whether you will have responsibility for the child\'s care.'
      );
      return;
    }

    setSaving(true);
    const res = await createLeaveRequest({
      leaveTypeId: selectedTypeId,
      dateFrom: toISODate(dateFrom),
      dateTo: toISODate(dateTo),
      reason: reason.trim() || undefined,
      // Sent only for parental leave. The API keys the block to the leave type
      // and drops it for anything else, so this is clarity rather than safety.
      ...(isParental
        ? {
            parentalLeave: {
              kind: parentalKind,
              ...(parentalKind === 'birth_before' && expectedDob
                ? { expectedDateOfBirth: toISODate(expectedDob) }
                : {}),
              responsibleForCare: responsibleForCare === true,
            },
          }
        : {}),
    });
    setSaving(false);

    if (res.success === false) {
      toast.error(res.message || 'Could not submit the request');
      return;
    }

    toast.success('Leave requested — your manager has been notified');
    if (router.canGoBack()) router.back();
    else router.replace('/shifts/leave');
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
            <Text style={styles.screenTitle}>Request Leave</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Leave Type</Text>
            <View style={styles.card}>
              {typesLoading ? (
                <ActivityIndicator color={glassTheme.colors.primary} />
              ) : types.length === 0 ? (
                <Text style={styles.helperText}>
                  No leave types are set up for your employment yet. Contact your
                  manager.
                </Text>
              ) : (
                <View style={styles.typeGrid}>
                  {types.map((type) => {
                    const selected = selectedTypeId === type._id;
                    return (
                      <TouchableOpacity
                        key={type._id}
                        style={[styles.typeChip, selected && styles.typeChipSelected]}
                        onPress={() => setSelectedTypeId(type._id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={type.name}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            selected && styles.typeChipTextSelected,
                          ]}
                        >
                          {type.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {selectedType?.description && (
              <Text style={styles.typeDescription}>{selectedType.description}</Text>
            )}

            {/* Family and domestic violence leave records are confidential and
                access-restricted by law. Saying so up front matters more than
                it costs. */}
            {selectedType?.confidential && (
              <View style={styles.infoBanner}>
                <Ionicons name="lock-closed-outline" size={16} color="#3A4A5A" />
                <Text style={styles.infoText}>
                  This request is confidential. Only the manager who decides it
                  can see it, and it will not appear on your pay slip.
                </Text>
              </View>
            )}

            {selectedType?.requiresEvidence && (
              <View style={styles.infoBanner}>
                <Ionicons name="document-text-outline" size={16} color="#3A4A5A" />
                <Text style={styles.infoText}>
                  Your manager may ask for evidence for this leave.
                </Text>
              </View>
            )}

            {/* The questions the NES turns on, asked here rather than left for
                a manager to chase afterwards. Without them nobody can say
                whether this leave is an entitlement at all. */}
            {isParental && (
              <>
                <Text style={styles.sectionLabel}>About this leave</Text>
                <View style={styles.card}>
                  {PARENTAL_KINDS.map(({ value, label }) => (
                    <TouchableOpacity
                      key={value}
                      style={styles.choiceRow}
                      onPress={() => setParentalKind(value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: parentalKind === value }}
                    >
                      <Ionicons
                        name={
                          parentalKind === value
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={20}
                        color="#3A4A5A"
                      />
                      <Text style={styles.choiceLabel}>{label}</Text>
                    </TouchableOpacity>
                  ))}

                  {parentalKind === 'birth_before' && (
                    <>
                      <View style={styles.divider} />
                      <DateField
                        label="Expected date of birth"
                        value={expectedDob ?? dateFrom}
                        onChange={(d) => setExpectedDob(d)}
                      />
                      {/* Why the field is worth the tap. */}
                      <Text style={styles.helpText}>
                        Your twelve months of service is counted to this date,
                        not to today.
                      </Text>
                    </>
                  )}

                  <View style={styles.divider} />
                  <Text style={styles.choiceLabel}>
                    Will you have responsibility for the child&apos;s care?
                  </Text>
                  {([true, false] as const).map((value) => (
                    <TouchableOpacity
                      key={String(value)}
                      style={styles.choiceRow}
                      onPress={() => setResponsibleForCare(value)}
                      accessibilityRole="radio"
                      accessibilityState={{
                        selected: responsibleForCare === value,
                      }}
                    >
                      <Ionicons
                        name={
                          responsibleForCare === value
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={20}
                        color="#3A4A5A"
                      />
                      <Text style={styles.choiceLabel}>
                        {value ? 'Yes' : 'No'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.helpText}>
                    The National Employment Standards make this part of the
                    entitlement, so it has to be answered either way.
                  </Text>
                </View>
              </>
            )}

            <Text style={styles.sectionLabel}>Dates</Text>
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

            {/* The preview is the point of the screen. A worker should never be
                surprised by how much of their balance a range costs. */}
            <Text style={styles.sectionLabel}>This will use</Text>
            <View style={styles.card}>
              {previewing ? (
                <ActivityIndicator color={glassTheme.colors.primary} />
              ) : preview ? (
                <>
                  <Text style={styles.previewHours}>
                    {preview.totalHours.toFixed(1)} hours
                  </Text>
                  <Text style={styles.helperText}>
                    {preview.days.filter((d) => d.hours > 0).length} working day
                    {preview.days.filter((d) => d.hours > 0).length === 1 ? '' : 's'}
                  </Text>

                  {preview.publicHolidaysExcluded.length > 0 && (
                    <Text style={styles.previewNote}>
                      {preview.publicHolidaysExcluded.length} public holiday
                      {preview.publicHolidaysExcluded.length === 1 ? '' : 's'} in
                      this range {preview.publicHolidaysExcluded.length === 1 ? 'is' : 'are'}{' '}
                      not deducted from your balance.
                    </Text>
                  )}

                  {preview.totalHours === 0 && (
                    <Text style={styles.previewWarning}>
                      No working hours in this range. Check the dates, or ask
                      your manager to set your ordinary hours.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.helperText}>Choose a valid date range.</Text>
              )}
            </View>

            <Text style={styles.sectionLabel}>Reason (optional)</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.notesInput}
                value={reason}
                onChangeText={(t) => setReason(t.slice(0, 500))}
                placeholder="Add a note for your manager..."
                placeholderTextColor={glassTheme.colors.text.placeholder}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel="Reason"
              />
              <Text style={styles.charCounter}>{reason.length}/500</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (saving || !selectedTypeId) && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving || !selectedTypeId}
              accessibilityRole="button"
              accessibilityLabel="Submit leave request"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Send request</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Your manager has to approve this before it affects your roster.
            </Text>
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
  backBtn: { padding: 4, marginRight: glassTheme.spacing.sm },
  headerRight: { width: 34 },
  screenTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.4,
    fontFamily: glassTheme.typography.fontFamily.bold,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: glassTheme.spacing.lg, paddingBottom: 64 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: glassTheme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: glassTheme.spacing.sm,
    marginTop: glassTheme.spacing.md,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: glassTheme.radius.large,
    padding: glassTheme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.09)',
    ...glassTheme.shadows.medium,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginVertical: glassTheme.spacing.sm,
  },

  // The Division 5 questions. A row is a whole tap target rather than just the
  // control, because these get answered one-handed on a phone.
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
    paddingVertical: glassTheme.spacing.sm,
  },
  choiceLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1E2A38',
  },
  helpText: {
    fontSize: 12,
    color: '#5A6A7A',
    marginTop: 2,
  },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: glassTheme.spacing.sm },
  typeChip: {
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  typeChipSelected: {
    backgroundColor: glassTheme.colors.primary + '1A',
    borderColor: glassTheme.colors.primary,
  },
  typeChipText: { fontSize: 13, color: glassTheme.colors.text.secondary },
  typeChipTextSelected: { color: glassTheme.colors.primary, fontWeight: '700' },
  typeDescription: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
    marginTop: glassTheme.spacing.sm,
    lineHeight: 17,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: glassTheme.spacing.sm,
    backgroundColor: '#EEF3F8',
    borderRadius: glassTheme.radius.medium,
    padding: glassTheme.spacing.md,
    marginTop: glassTheme.spacing.sm,
  },
  infoText: { flex: 1, fontSize: 12, color: '#3A4A5A', lineHeight: 17 },

  previewHours: {
    fontSize: 28,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    fontFamily: glassTheme.typography.fontFamily.bold,
  },
  previewNote: {
    fontSize: 12,
    color: glassTheme.colors.success ?? '#34C759',
    marginTop: glassTheme.spacing.sm,
    lineHeight: 17,
  },
  previewWarning: {
    fontSize: 12,
    color: glassTheme.colors.danger,
    marginTop: glassTheme.spacing.sm,
    lineHeight: 17,
  },
  helperText: { fontSize: 13, color: glassTheme.colors.text.tertiary },

  notesInput: {
    fontSize: 15,
    color: glassTheme.colors.text.primary,
    minHeight: 90,
    padding: 0,
  },
  charCounter: {
    fontSize: 11,
    color: glassTheme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: glassTheme.spacing.xs,
  },

  saveBtn: {
    backgroundColor: glassTheme.colors.primary,
    borderRadius: glassTheme.radius.medium,
    paddingVertical: glassTheme.spacing.md,
    alignItems: 'center',
    marginTop: glassTheme.spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footerNote: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: glassTheme.spacing.md,
  },
});
