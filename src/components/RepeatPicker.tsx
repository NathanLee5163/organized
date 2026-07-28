import { useState } from 'react';
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
import {
  type Recurrence,
  type RepeatPreset,
  presetOptions,
  recurrenceFromPreset,
  recurrenceLabel,
} from '@/src/utils/recurrence';

const WEEKDAY_LABELS = [
  { day: 0, label: 'S' },
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
];

type Props = {
  dateKey: string;
  value: Recurrence;
  onChange: (next: Recurrence) => void;
};

export function RepeatPicker({ dateKey, value, onChange }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const options = presetOptions(dateKey);
  const summary = recurrenceLabel(value, dateKey);

  const selectPreset = (preset: RepeatPreset) => {
    if (preset === 'custom') {
      onChange(
        value.preset === 'custom' ? value : recurrenceFromPreset('custom', dateKey)
      );
      return;
    }
    onChange(recurrenceFromPreset(preset, dateKey));
    setOpen(false);
  };

  const toggleDay = (day: number) => {
    const set = new Set(value.daysOfWeek);
    if (set.has(day)) {
      if (set.size === 1) return;
      set.delete(day);
    } else {
      set.add(day);
    }
    onChange({
      preset: 'custom',
      daysOfWeek: Array.from(set).sort((a, b) => a - b),
      interval: value.interval || 1,
    });
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { backgroundColor: colors.bubble, borderColor: colors.hairline },
        ]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.triggerTitle, { color: colors.text }]}>Repeat</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: Fonts.body, fontSize: 13 }}>
            {summary}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.timelineCard,
              borderColor: colors.hairline,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Repeat</Text>

          <ScrollView
            style={styles.sheetScroll}
            bounces={false}
            showsVerticalScrollIndicator={false}>
            {options.map((option, index) => {
              const selected =
                option.preset === 'custom'
                  ? value.preset === 'custom'
                  : value.preset === option.preset;
              return (
                <Pressable
                  key={option.preset}
                  onPress={() => selectPreset(option.preset)}
                  style={[
                    styles.optionRow,
                    index < options.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.hairline,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: colors.text,
                        fontFamily: selected ? Fonts.bodySemi : Fonts.body,
                      },
                    ]}>
                    {option.label}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? colors.tint : colors.border,
                        backgroundColor: selected ? colors.tint : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}

            {value.preset === 'custom' ? (
              <View style={styles.customBlock}>
                <Text style={[styles.customTitle, { color: colors.textSecondary }]}>
                  Repeat on
                </Text>
                <View style={styles.dayRow}>
                  {WEEKDAY_LABELS.map((item) => {
                    const on = value.daysOfWeek.includes(item.day);
                    return (
                      <PressableScale
                        key={item.day}
                        onPress={() => toggleDay(item.day)}
                        style={[
                          styles.dayChip,
                          {
                            backgroundColor: on ? colors.tint : colors.muted,
                            borderColor: on ? colors.tint : colors.hairline,
                          },
                        ]}
                        scaleTo={0.92}>
                        <Text
                          style={[
                            styles.dayChipText,
                            { color: on ? colors.onTint : colors.text },
                          ]}>
                          {item.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
                <Text style={[styles.customHint, { color: colors.textSecondary }]}>
                  {recurrenceLabel(value, dateKey)}
                </Text>
                <PressableScale
                  onPress={() => setOpen(false)}
                  style={[styles.doneBtn, { backgroundColor: colors.tint }]}>
                  <Text style={[styles.doneText, { color: colors.onTint }]}>Done</Text>
                </PressableScale>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  triggerTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    marginBottom: 2,
  },
  chevron: {
    fontFamily: Fonts.body,
    fontSize: 24,
    lineHeight: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '72%',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sheetScroll: {
    paddingHorizontal: 8,
  },
  optionRow: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  customBlock: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
  },
  customTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
  },
  customHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  doneBtn: {
    marginTop: 4,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
  },
});
