import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import { formatDurationMinutes, useGoals } from '@/src/context/GoalContext';
import type { Goal, GoalActivity } from '@/src/types/goal';
import { minutesToLabel } from '@/src/utils/dates';
import { hapticLight } from '@/src/utils/haptics';

type Props = {
  goal: Goal | null;
  visible: boolean;
  onClose: () => void;
  onSchedule: (goal: Goal) => void;
};

export function GoalDetailSheet({ goal, visible, onClose, onSchedule }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { setGoalStatus, getGoalActivities, getGoalTotalMinutes, openBlockByGoalId } =
    useGoals();
  const [busy, setBusy] = useState(false);
  const [activities, setActivities] = useState<GoalActivity[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const openBlock = goal ? openBlockByGoalId[goal.id] : undefined;
  const canReserve = goal?.status === 'active' && !openBlock;

  useEffect(() => {
    if (!visible || !goal) return;
    void (async () => {
      const [list, total] = await Promise.all([
        getGoalActivities(goal.id),
        getGoalTotalMinutes(goal.id),
      ]);
      setActivities(list);
      setTotalMinutes(total);
    })();
  }, [visible, goal, getGoalActivities, getGoalTotalMinutes, goal?.updatedAt]);

  if (!goal) return null;

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
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.hairline }]} />
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Goal</Text>
          <Text style={[styles.title, { color: colors.text }]}>{goal.title}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {totalMinutes > 0
              ? `${formatDurationMinutes(totalMinutes)} logged · ${activities.length} session${
                  activities.length === 1 ? '' : 's'
                }`
              : 'No work logged yet — finish a runway block to add one'}
            {goal.blockCount > 0 ? ` · ${goal.blockCount}× blocked` : ''}
          </Text>

          <View style={styles.actions}>
            {openBlock ? (
              <View
                style={[
                  styles.inProgressBanner,
                  { backgroundColor: colors.tintSoft, borderColor: colors.tint },
                ]}>
                <Text style={[styles.inProgressTitle, { color: colors.tint }]}>In progress</Text>
                <Text style={[styles.inProgressCopy, { color: colors.textSecondary }]}>
                  Already on the runway. Finish or cancel that block before reserving another.
                </Text>
              </View>
            ) : (
              <PressableScale
                onPress={() => {
                  if (!canReserve) return;
                  hapticLight();
                  onClose();
                  onSchedule(goal);
                }}
                disabled={!canReserve}
                style={[
                  styles.primary,
                  {
                    backgroundColor: colors.tint,
                    opacity: canReserve ? 1 : 0.45,
                  },
                ]}>
                <Text style={[styles.primaryLabel, { color: colors.onTint }]}>
                  Reserve a block
                </Text>
              </PressableScale>
            )}
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>Work log</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {activities.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                When you tap Finished on a goal block, that day and time show up here.
              </Text>
            ) : (
              activities.map((a) => (
                <View
                  key={a.id}
                  style={[styles.row, { borderBottomColor: colors.hairline }]}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {a.date} · {minutesToLabel(a.startMinutes)}–{minutesToLabel(a.endMinutes)}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                    {formatDurationMinutes(a.durationMinutes)}
                    {a.note ? ` · ${a.note}` : ''}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {goal.status === 'active' ? (
            <PressableScale
              onPress={() => {
                if (busy) return;
                setBusy(true);
                hapticLight();
                void setGoalStatus(goal.id, 'done').finally(() => {
                  setBusy(false);
                  onClose();
                });
              }}
              style={styles.doneLink}>
              <Text style={[styles.doneLinkText, { color: colors.textSecondary }]}>
                Mark goal done
              </Text>
            </PressableScale>
          ) : null}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '85%',
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
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  actions: { gap: 10, marginBottom: 16 },
  primary: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: { fontFamily: Fonts.bodySemi, fontSize: 16 },
  inProgressBanner: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  inProgressTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
    marginBottom: 4,
  },
  inProgressCopy: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  list: { maxHeight: 260 },
  empty: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontFamily: Fonts.bodySemi, fontSize: 14 },
  rowSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },
  doneLink: { alignItems: 'center', paddingVertical: 14 },
  doneLinkText: { fontFamily: Fonts.bodyMedium, fontSize: 13 },
});
