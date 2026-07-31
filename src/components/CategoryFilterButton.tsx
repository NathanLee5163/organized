import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { useAuth } from '@/src/auth/AuthContext';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import { hapticLight } from '@/src/utils/haptics';

/**
 * Compact header control — opens a sheet to toggle which calendars show
 * on Runway. Keeps the category list out of the main scroll.
 */
export function CategoryFilterButton() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { calendars, readIds, toggleCategory } = useCalendars();
  const { onCategoriesChanged } = useTodos();
  const [open, setOpen] = useState(false);

  if (!isSignedIn || calendars.length === 0) return null;

  const onCount = calendars.filter((c) => readIds.includes(c.id)).length;
  const label =
    onCount === calendars.length
      ? 'All'
      : onCount === 0
        ? 'None'
        : `${onCount}/${calendars.length}`;

  const onToggle = (id: string) => {
    hapticLight();
    void (async () => {
      await toggleCategory(id);
      await onCategoriesChanged();
    })();
  };

  return (
    <>
      <PressableScale
        onPress={() => {
          hapticLight();
          setOpen(true);
        }}
        style={[
          styles.trigger,
          { borderColor: colors.hairline, backgroundColor: colors.bubble },
        ]}>
        <Text style={[styles.triggerLabel, { color: colors.text }]}>Categories</Text>
        <Text style={[styles.triggerCount, { color: colors.textSecondary }]}>{label}</Text>
      </PressableScale>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}>
        <View style={styles.root}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setOpen(false)}
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
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Categories</Text>
              <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                Show or hide calendars on Runway
              </Text>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}>
              {calendars.map((cal, index) => {
                const on = readIds.includes(cal.id);
                const tint = cal.backgroundColor ?? colors.tint;
                return (
                  <View
                    key={cal.id}
                    style={[
                      styles.row,
                      index < calendars.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.hairline,
                      },
                    ]}>
                    <View style={[styles.dot, { backgroundColor: tint }]} />
                    <Text
                      style={[styles.rowLabel, { color: colors.text }]}
                      numberOfLines={1}>
                      {cal.summary}
                    </Text>
                    <Switch
                      value={on}
                      onValueChange={() => onToggle(cal.id)}
                      trackColor={{ true: tint, false: colors.border }}
                      thumbColor="#F7F8FA"
                    />
                  </View>
                );
              })}
            </ScrollView>

            <PressableScale
              onPress={() => setOpen(false)}
              style={[styles.done, { backgroundColor: colors.tint }]}>
              <Text style={[styles.doneLabel, { color: colors.onTint }]}>Done</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  triggerLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  triggerCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
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
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  sheetHeader: {
    marginBottom: 8,
    gap: 4,
  },
  sheetTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
  },
  sheetSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowLabel: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
  },
  done: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
  },
});
