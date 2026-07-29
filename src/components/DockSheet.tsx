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
import { useTodos } from '@/src/context/TodoContext';
import { usePreferences } from '@/src/preferences/PreferencesContext';
import type { Todo } from '@/src/types/todo';
import { addDays, formatDisplayDate, toDateKey } from '@/src/utils/dates';
import type { RunwayGap } from '@/src/utils/runwayGaps';
import { hapticLight } from '@/src/utils/haptics';

type Props = {
  todo: Todo | null;
  visible: boolean;
  onClose: () => void;
  /** Called with the day the task landed on. */
  onDocked?: (date: string) => void;
  /** Reschedule an already-docked runway block without bouncing to Loose. */
  mode?: 'dock' | 'reschedule';
};

type Step = 'duration' | 'gaps';

function dayOptions(fromKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(fromKey, i));
}

function shortDayLabel(dateKey: string, today: string): string {
  if (dateKey === today) return 'Today';
  if (dateKey === addDays(today, 1)) return 'Tomorrow';
  const d = formatDisplayDate(dateKey);
  // "Wed, Jul 30" → weekday for chips
  return d.split(',')[0] ?? d;
}

function daySubLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Two fixed steps so the duration wheel never fights a resizing gap list. */
export function DockSheet({
  todo,
  visible,
  onClose,
  onDocked,
  mode = 'dock',
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { defaultDuration } = usePreferences();
  const { previewRunwayGaps, dockToRunway } = useTodos();
  const [duration, setDuration] = useState(() => clampDockDuration(defaultDuration));
  const [gaps, setGaps] = useState<RunwayGap[]>([]);
  const [loading, setLoading] = useState(false);
  const [docking, setDocking] = useState(false);
  const [step, setStep] = useState<Step>('duration');
  const [day, setDay] = useState(() => toDateKey(new Date()));

  const today = useMemo(() => toDateKey(new Date()), [visible]);
  const days = useMemo(() => dayOptions(today), [today]);
  const todoId = todo?.id;
  const reschedule = mode === 'reschedule';

  useEffect(() => {
    if (!visible || !todo) return;
    setDuration(
      clampDockDuration(reschedule ? todo.durationMinutes || defaultDuration : defaultDuration)
    );
    setDay(
      reschedule && todo.date
        ? todo.date < today
          ? today
          : todo.date > addDays(today, 6)
            ? addDays(today, 6)
            : todo.date
        : today
    );
    setGaps([]);
    setLoading(false);
    setStep('duration');
    setDocking(false);
  }, [visible, defaultDuration, todoId, reschedule, todo, today]);

  useEffect(() => {
    if (!visible || !todo || step !== 'gaps') return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const now = new Date();
      const fromMinutes =
        day === toDateKey(now) ? now.getHours() * 60 + now.getMinutes() : 8 * 60;
      const next = await previewRunwayGaps(
        day,
        duration,
        fromMinutes,
        reschedule ? todo.id : undefined
      );
      if (!cancelled) {
        setGaps(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, todo, duration, day, previewRunwayGaps, step, reschedule]);

  const onPick = async (gap: RunwayGap) => {
    if (!todo || docking) return;
    setDocking(true);
    hapticLight();
    try {
      await dockToRunway(todo.id, {
        date: day,
        startMinutes: gap.startMinutes,
        durationMinutes: duration,
      });
      onDocked?.(day);
      onClose();
    } finally {
      setDocking(false);
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
            {reschedule
              ? step === 'duration'
                ? 'Reschedule · duration'
                : 'Reschedule · gap'
              : step === 'duration'
                ? 'Dock · duration'
                : 'Dock · runway gap'}
          </Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {todo?.title ?? ''}
          </Text>
          {(todo?.dockCount ?? 0) > 0 ? (
            <Text style={[styles.history, { color: colors.textSecondary }]}>
              Docked {todo!.dockCount}× before
            </Text>
          ) : null}

          {step === 'duration' ? (
            <View style={styles.stepBody}>
              <Text style={[styles.lead, { color: colors.textSecondary }]}>
                {reschedule
                  ? 'Pick a new day and length. Your current runway slot frees up when you land.'
                  : 'Choose a day and how long to work this. Finish later — or send it back to Loose.'}
              </Text>

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

              <Text style={[styles.section, { color: colors.textSecondary }]}>
                Duration · {formatDockDuration(duration)}
              </Text>
              <DurationWheel valueMinutes={duration} onChange={setDuration} />
              <Pressable
                onPress={() => {
                  hapticLight();
                  setStep('gaps');
                }}
                style={[styles.primary, { backgroundColor: colors.tint }]}>
                <Text style={[styles.primaryText, { color: colors.onTint }]}>
                  Find a gap · {formatDisplayDate(day)}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.cancel} hitSlop={8}>
                <Text style={{ color: colors.textSecondary, fontFamily: Fonts.bodyMedium }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stepBody}>
              <Text style={[styles.lead, { color: colors.textSecondary }]}>
                {formatDockDuration(duration)} on {formatDisplayDate(day)}. Pick where it lands.
              </Text>
              <View style={styles.gapsFrame}>
                {loading ? (
                  <ActivityIndicator color={colors.tint} style={{ marginVertical: 28 }} />
                ) : gaps.length === 0 ? (
                  <View style={[styles.empty, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      Runway looks packed
                    </Text>
                    <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
                      Not enough open time on {formatDisplayDate(day)} for{' '}
                      {formatDockDuration(duration)}. Try another day or a shorter duration.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.list}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}>
                    {gaps.map((gap) => (
                      <Pressable
                        key={`${gap.startMinutes}-${gap.endMinutes}`}
                        disabled={docking}
                        onPress={() => void onPick(gap)}
                        style={[
                          styles.gapRow,
                          {
                            backgroundColor: colors.bubble,
                            borderColor: colors.hairline,
                            opacity: docking ? 0.6 : 1,
                          },
                        ]}>
                        <View style={[styles.gapRail, { backgroundColor: colors.tint }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.gapLabel, { color: colors.text }]}>
                            {gap.label}
                          </Text>
                          <Text
                            style={[styles.gapDetail, { color: colors.textSecondary }]}
                            numberOfLines={2}>
                            {gap.detail}
                          </Text>
                        </View>
                        <Text style={[styles.dockCta, { color: colors.tint }]}>Land</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
              <Pressable
                onPress={() => setStep('duration')}
                style={styles.cancel}
                hitSlop={8}>
                <Text style={{ color: colors.textSecondary, fontFamily: Fonts.bodyMedium }}>
                  ← Change day or duration
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
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
    marginBottom: 4,
  },
  history: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginBottom: 8,
  },
  stepBody: {
    minHeight: 360,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  section: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  dayScroll: {
    marginBottom: 16,
    flexGrow: 0,
  },
  dayRow: {
    gap: 8,
    paddingRight: 8,
  },
  dayChip: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 78,
  },
  dayChipTop: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
    marginBottom: 2,
  },
  dayChipSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  primary: {
    marginTop: 18,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
  },
  gapsFrame: {
    height: 240,
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
    height: 240,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    marginBottom: 8,
    overflow: 'hidden',
  },
  gapRail: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  gapLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  gapDetail: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  dockCta: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
  },
  empty: {
    borderRadius: 16,
    padding: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    marginBottom: 6,
  },
  emptyCopy: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
});
