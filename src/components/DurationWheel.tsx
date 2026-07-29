import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = [0, 15, 30, 45] as const;

/** Max dock session: 23h 45m. Min: 15m. */
export const MAX_DOCK_MINUTES = 23 * 60 + 45;
export const MIN_DOCK_MINUTES = 15;

export function clampDockDuration(minutes: number): number {
  const stepped = Math.round(minutes / 15) * 15;
  return Math.min(MAX_DOCK_MINUTES, Math.max(MIN_DOCK_MINUTES, stepped));
}

export function formatDockDuration(minutes: number): string {
  const m = clampDockDuration(minutes);
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

type Props = {
  valueMinutes: number;
  onChange: (minutes: number) => void;
};

function snapIndex(offset: number, count: number): number {
  const i = Math.round(offset / ITEM_H);
  return Math.max(0, Math.min(count - 1, i));
}

function Column({
  values,
  selected,
  labels,
  onSelect,
}: {
  values: readonly number[];
  selected: number;
  labels: (v: number) => string;
  onSelect: (v: number) => void;
}) {
  const colors = useThemeColors();
  const ref = useRef<ScrollView>(null);
  const selectedRef = useRef(selected);
  const ready = useRef(false);
  selectedRef.current = selected;
  const index = Math.max(0, values.indexOf(selected));

  useEffect(() => {
    const y = index * ITEM_H;
    const id = requestAnimationFrame(() => {
      ref.current?.scrollTo({ y, animated: false });
      ready.current = true;
    });
    return () => cancelAnimationFrame(id);
    // Only re-sync when the committed value changes from outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const commit = (y: number) => {
    if (!ready.current) return;
    const i = snapIndex(y, values.length);
    const next = values[i]!;
    if (next !== selectedRef.current) onSelect(next);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commit(e.nativeEvent.contentOffset.y);
  };

  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const vy = e.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(vy) < 0.04) commit(e.nativeEvent.contentOffset.y);
  };

  return (
    <ScrollView
      ref={ref}
      style={styles.col}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      snapToAlignment="center"
      disableIntervalMomentum
      decelerationRate="fast"
      bounces={false}
      overScrollMode="never"
      scrollEventThrottle={32}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}>
      {values.map((v) => {
        const on = v === selected;
        return (
          <View key={v} style={styles.item} pointerEvents="none">
            <Text
              style={[
                styles.itemText,
                { color: on ? colors.text : colors.textSecondary, opacity: on ? 1 : 0.35 },
              ]}>
              {labels(v)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export function DurationWheel({ valueMinutes, onChange }: Props) {
  const colors = useThemeColors();
  // Keep a local draft so parent layout (gaps) doesn’t reflow mid-scroll.
  const [draft, setDraft] = useState(() => clampDockDuration(valueMinutes));

  useEffect(() => {
    setDraft(clampDockDuration(valueMinutes));
  }, [valueMinutes]);

  const hours = Math.floor(draft / 60);
  const mins = draft % 60;

  const publish = (next: number) => {
    const clamped = clampDockDuration(next);
    setDraft(clamped);
    onChange(clamped);
  };

  const setHours = (h: number) => {
    let m = mins;
    if (h === 0 && m < MIN_DOCK_MINUTES) m = MIN_DOCK_MINUTES;
    publish(h * 60 + m);
  };

  const setMins = (m: number) => {
    publish(hours * 60 + (m === 0 && hours === 0 ? MIN_DOCK_MINUTES : m));
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.muted, borderColor: colors.hairline }]}>
      <View
        style={[styles.highlight, { backgroundColor: colors.bubble, borderColor: colors.hairline }]}
        pointerEvents="none"
      />
      <Column values={HOURS} selected={hours} labels={(h) => `${h}`} onSelect={setHours} />
      <Text style={[styles.sep, { color: colors.textSecondary }]}>hr</Text>
      <Column
        values={MINS}
        selected={mins}
        labels={(m) => String(m).padStart(2, '0')}
        onSelect={setMins}
      />
      <Text style={[styles.sep, { color: colors.textSecondary }]}>min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_H * VISIBLE,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: PAD,
    height: ITEM_H,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  col: {
    width: 72,
    height: ITEM_H * VISIBLE,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  sep: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    marginHorizontal: 2,
    width: 28,
  },
});
