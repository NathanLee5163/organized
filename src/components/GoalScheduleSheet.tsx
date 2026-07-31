import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import {
  clampDockDuration,
  DurationWheel,
  formatDockDuration,
} from '@/src/components/DurationWheel';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useGoals } from '@/src/context/GoalContext';
import { useTodos } from '@/src/context/TodoContext';
import { usePreferences } from '@/src/preferences/PreferencesContext';
import type { Goal } from '@/src/types/goal';
import { addDays, formatDisplayDate, toDateKey } from '@/src/utils/dates';
import type { RunwayGap } from '@/src/utils/runwayGaps';
import { hapticLight } from '@/src/utils/haptics';

type Props = {
  goal: Goal | null;
  visible: boolean;
  onClose: () => void;
  onScheduled?: (date: string) => void;
};

type Step = 'duration' | 'gaps';

function dayOptions(fromKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(fromKey, i));
}

function shortDayLabel(dateKey: string, today: string): string {
  if (dateKey === today) return 'Today';
  if (dateKey === addDays(today, 1)) return 'Tomorrow';
  const d = formatDisplayDate(dateKey);
  return d.split(',')[0] ?? d;
}

function daySubLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Reserve a free runway gap for a goal — Start still happens manually later. */
export function GoalScheduleSheet({ goal, visible, onClose, onScheduled }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { defaultDuration } = usePreferences();
  const { previewRunwayGaps } = useTodos();
  const { scheduleGoalBlock } = useGoals();
  const [duration, setDuration] = useState(() => clampDockDuration(defaultDuration));
  const [gaps, setGaps] = useState<RunwayGap[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>('duration');
  const [day, setDay] = useState(() => toDateKey(new Date()));

  const today = useMemo(() => toDateKey(new Date()), [visible]);
  const days = useMemo(() => dayOptions(today), [today]);
  const goalId = goal?.id;

  useEffect(() => {
    if (!visible || !goal) return;
    setDuration(clampDockDuration(defaultDuration));
    setDay(today);
    setGaps([]);
    setLoading(false);
    setStep('duration');
    setSaving(false);
  }, [visible, defaultDuration, goalId, goal, today]);

  useEffect(() => {
    if (!visible || !goal || step !== 'gaps') return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const now = new Date();
      const fromMinutes =
        day === toDateKey(now) ? now.getHours() * 60 + now.getMinutes() : 8 * 60;
      const next = await previewRunwayGaps(day, duration, fromMinutes);
      if (!cancelled) {
        setGaps(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, goal, duration, day, previewRunwayGaps, step]);

  const onPick = async (gap: RunwayGap) => {
    if (!goal || saving) return;
    setSaving(true);
    hapticLight();
    try {
      await scheduleGoalBlock(goal.id, {
        date: day,
        startMinutes: gap.startMinutes,
        durationMinutes: duration,
      });
      onScheduled?.(day);
      onClose();
    } catch {
      // Already has an open block — close the sheet; Goals list shows In progress.
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceSolid,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
            {step === 'duration' ? 'Block · duration' : 'Block · free gap'}
          </Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {goal?.title ?? ''}
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            Reserve time on the runway. When you wrap up, Finished logs this block under the goal.
          </Text>

          {step === 'duration' ? (
            <View style={styles.stepBody}>
              <Text style={[styles.section, { color: colors.textSecondary }]}>Day</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayRow}
                style={styles.dayScroll}>
                {days.map((key) => {
                  const on = key === day;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => {
                        hapticLight();
                        setDay(key);
                      }}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: on ? colors.tint : colors.muted,
                          borderColor: on ? colors.tint : colors.hairline,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.dayChipTop,
                          { color: on ? colors.onTint : colors.text },
                        ]}>
                        {shortDayLabel(key, today)}
                      </Text>
                      <Text
                        style={[
                          styles.dayChipSub,
                          { color: on ? colors.onTint : colors.textSecondary },
                        ]}>
                        {daySubLabel(key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.section, { color: colors.textSecondary }]}>Length</Text>
              <DurationWheel valueMinutes={duration} onChange={setDuration} />

              <Pressable
                onPress={() => {
                  hapticLight();
                  setStep('gaps');
                }}
                style={[styles.primary, { backgroundColor: colors.tint }]}>
                <Text style={[styles.primaryLabel, { color: colors.onTint }]}>
                  Find gaps · {formatDockDuration(duration)}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stepBody}>
              <Pressable
                onPress={() => setStep('duration')}
                style={styles.backRow}>
                <Text style={[styles.back, { color: colors.tint }]}>‹ Change day / length</Text>
              </Pressable>
              {loading ? (
                <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
              ) : gaps.length === 0 ? (
                <Text style={[styles.emptyGaps, { color: colors.textSecondary }]}>
                  No open gaps that day for {formatDockDuration(duration)}. Try a shorter block
                  or another day.
                </Text>
              ) : (
                <ScrollView style={styles.gapList} showsVerticalScrollIndicator={false}>
                  {gaps.map((gap) => (
                    <Pressable
                      key={`${gap.startMinutes}-${gap.endMinutes}`}
                      disabled={saving}
                      onPress={() => void onPick(gap)}
                      style={[
                        styles.gapRow,
                        { backgroundColor: colors.muted, borderColor: colors.hairline },
                      ]}>
                      <Text style={[styles.gapTime, { color: colors.text }]}>
                        {gap.label}
                      </Text>
                      <Text style={[styles.gapAction, { color: colors.tint }]}>
                        {saving ? '…' : 'Reserve'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  eyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  stepBody: { minHeight: 280 },
  section: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  dayScroll: { marginBottom: 8, flexGrow: 0 },
  dayRow: { gap: 8, paddingRight: 8 },
  dayChip: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 76,
  },
  dayChipTop: { fontFamily: Fonts.bodySemi, fontSize: 14 },
  dayChipSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },
  primary: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: { fontFamily: Fonts.bodySemi, fontSize: 16 },
  backRow: { marginBottom: 10 },
  back: { fontFamily: Fonts.bodyMedium, fontSize: 14 },
  emptyGaps: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },
  gapList: { maxHeight: 320 },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  gapTime: { fontFamily: Fonts.bodySemi, fontSize: 15 },
  gapAction: { fontFamily: Fonts.bodyMedium, fontSize: 14 },
});
