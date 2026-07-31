import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Fonts } from '@/constants/Colors';
import { formatDockDuration } from '@/src/components/DurationWheel';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import { formatDurationMinutes, useGoals } from '@/src/context/GoalContext';
import type { Goal } from '@/src/types/goal';
import type { Todo } from '@/src/types/todo';
import { formatDisplayDate, minutesToLabel } from '@/src/utils/dates';
import { hapticLight } from '@/src/utils/haptics';

type Props = {
  goals: Goal[];
  onPressGoal: (goal: Goal) => void;
  onScheduleGoal: (goal: Goal) => void;
  onAdd: () => void;
};

function blockLabel(block: Todo): string {
  const when = formatDisplayDate(block.date);
  const time =
    block.startMinutes != null ? minutesToLabel(block.startMinutes) : 'Anytime';
  return `${when} · ${time} · ${formatDockDuration(block.durationMinutes)}`;
}

export function GoalsBoard({ goals, onPressGoal, onScheduleGoal, onAdd }: Props) {
  const colors = useThemeColors();
  const { getGoalTotalMinutes, openBlockByGoalId } = useGoals();
  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status !== 'active');

  const { inProgress, ready } = useMemo(() => {
    const progress: Goal[] = [];
    const idle: Goal[] = [];
    for (const g of active) {
      if (openBlockByGoalId[g.id]) progress.push(g);
      else idle.push(g);
    }
    return { inProgress: progress, ready: idle };
  }, [active, openBlockByGoalId]);

  if (goals.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(220)} style={styles.emptyWrap}>
        <View
          style={[styles.heroCard, { backgroundColor: colors.muted, borderColor: colors.hairline }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', colors.night + '22', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Goals</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing ambitious yet</Text>
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
            Park multi-day aims here. Reserve a runway block, then wrap up with Finished to log the
            work.
          </Text>
          <PressableScale
            onPress={onAdd}
            style={[styles.emptyCta, { backgroundColor: colors.tint }]}>
            <Text style={[styles.emptyCtaText, { color: colors.onTint }]}>Add a goal</Text>
          </PressableScale>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.headerCard, { backgroundColor: colors.muted, borderColor: colors.hairline }]}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.night + '18', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Goals</Text>
            <Text style={[styles.headline, { color: colors.text }]}>
              {active.length === 0
                ? 'All clear'
                : active.length === 1
                  ? '1 active'
                  : `${active.length} active`}
            </Text>
          </View>
          <PressableScale
            onPress={onAdd}
            style={[
              styles.addPill,
              { borderColor: colors.hairline, backgroundColor: colors.bubble },
            ]}>
            <Text style={[styles.addPillText, { color: colors.text }]}>+ Add</Text>
          </PressableScale>
        </View>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          One open block at a time. Wrap it up before you reserve another.
        </Text>
      </View>

      {inProgress.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>In progress</Text>
          <View style={styles.list}>
            {inProgress.map((goal) => {
              const block = openBlockByGoalId[goal.id]!;
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => onPressGoal(goal)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.tint,
                    },
                  ]}>
                  <View style={[styles.rail, { backgroundColor: colors.tint }]} />
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                      {goal.title}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                      On runway · {blockLabel(block)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: colors.tintSoft, borderColor: colors.tint },
                    ]}>
                    <Text style={[styles.statusPillText, { color: colors.tint }]}>Live</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {ready.length > 0 ? (
        <View style={styles.section}>
          {inProgress.length > 0 ? (
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Ready</Text>
          ) : null}
          <View style={styles.list}>
            {ready.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                accent={colors.night}
                onPress={() => onPressGoal(goal)}
                onSchedule={() => {
                  hapticLight();
                  onScheduleGoal(goal);
                }}
                loadTotal={getGoalTotalMinutes}
              />
            ))}
          </View>
        </View>
      ) : null}

      {done.length > 0 ? (
        <View style={styles.doneSection}>
          <Text style={[styles.doneLabel, { color: colors.textSecondary }]}>Done / parked</Text>
          {done.map((goal) => (
            <Pressable
              key={goal.id}
              onPress={() => onPressGoal(goal)}
              style={[styles.doneRow, { borderBottomColor: colors.hairline }]}>
              <Text
                style={[styles.doneTitle, { color: colors.textSecondary }]}
                numberOfLines={1}>
                {goal.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function GoalRow({
  goal,
  accent,
  onPress,
  onSchedule,
  loadTotal,
}: {
  goal: Goal;
  accent: string;
  onPress: () => void;
  onSchedule: () => void;
  loadTotal: (id: string) => Promise<number>;
}) {
  const colors = useThemeColors();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTotal(goal.id).then((n) => {
      if (!cancelled) setTotal(n);
    });
    return () => {
      cancelled = true;
    };
  }, [goal.id, goal.updatedAt, loadTotal]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.bubble,
          borderColor: colors.hairline,
        },
      ]}>
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
          {goal.title}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
          {total != null && total > 0
            ? `${formatDurationMinutes(total)} logged`
            : 'No work logged yet'}
          {goal.blockCount > 0 ? ` · ${goal.blockCount}× blocked` : ''}
        </Text>
      </View>
      <PressableScale
        onPress={onSchedule}
        style={[styles.blockBtn, { backgroundColor: colors.tint }]}>
        <Text style={[styles.blockBtnText, { color: colors.onTint }]}>Block</Text>
      </PressableScale>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  emptyWrap: { marginTop: 8 },
  heroCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  emptyCopy: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyCtaText: { fontFamily: Fonts.bodySemi, fontSize: 15 },
  headerCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    overflow: 'hidden',
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  addPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addPillText: { fontFamily: Fonts.bodyMedium, fontSize: 13 },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  section: { gap: 8 },
  sectionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingRight: 10,
    minHeight: 72,
  },
  rail: { width: 4, alignSelf: 'stretch' },
  rowBody: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  rowTitle: { fontFamily: Fonts.bodySemi, fontSize: 16, marginBottom: 4 },
  rowMeta: { fontFamily: Fonts.body, fontSize: 12 },
  blockBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  blockBtnText: { fontFamily: Fonts.bodySemi, fontSize: 13 },
  statusPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
  },
  doneSection: { marginTop: 8 },
  doneLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  doneRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  doneTitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
});
