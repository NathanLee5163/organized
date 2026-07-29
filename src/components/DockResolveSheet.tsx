import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import type { Todo } from '@/src/types/todo';
import { hapticLight } from '@/src/utils/haptics';

type Props = {
  todo: Todo | null;
  visible: boolean;
  onClose: () => void;
  onReturnedToLoose?: () => void;
  /** Still working — keep on runway, open reschedule dock. */
  onReschedule?: (todo: Todo) => void;
};

/**
 * Wrap-up for Loose → Runway dock sessions:
 * finished · reschedule · back to Loose.
 */
export function DockResolveSheet({
  todo,
  visible,
  onClose,
  onReturnedToLoose,
  onReschedule,
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { finishDockedSession, returnDockedToLoose } = useTodos();
  const [busy, setBusy] = useState(false);

  const onFinished = async () => {
    if (!todo || busy) return;
    setBusy(true);
    hapticLight();
    try {
      await finishDockedSession(todo.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const onParkLoose = async () => {
    if (!todo || busy) return;
    setBusy(true);
    hapticLight();
    try {
      await returnDockedToLoose(todo.id);
      onReturnedToLoose?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const onKeepWorking = () => {
    if (!todo || busy) return;
    hapticLight();
    const target = todo;
    onClose();
    onReschedule?.(target);
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
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Dock wrap-up</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {todo?.title ?? ''}
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            Finished — or still working? You can land it again or park it back on Loose.
          </Text>
          {(todo?.dockCount ?? 0) > 0 ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Docked {todo!.dockCount}× so far
            </Text>
          ) : null}

          <Pressable
            disabled={busy}
            onPress={() => void onFinished()}
            style={[
              styles.primary,
              { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 },
            ]}>
            <Text style={[styles.primaryText, { color: colors.onTint }]}>Finished</Text>
            <Text style={[styles.primaryHint, { color: colors.onTint }]}>Check it off</Text>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={onKeepWorking}
            style={[
              styles.secondary,
              {
                backgroundColor: colors.muted,
                borderColor: colors.hairline,
                opacity: busy ? 0.6 : 1,
              },
            ]}>
            <Text style={[styles.secondaryText, { color: colors.text }]}>Still working</Text>
            <Text style={[styles.secondaryHint, { color: colors.textSecondary }]}>
              Reschedule on the runway
            </Text>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() => void onParkLoose()}
            style={[
              styles.secondary,
              {
                backgroundColor: colors.bubble,
                borderColor: colors.hairline,
                opacity: busy ? 0.6 : 1,
              },
            ]}>
            <Text style={[styles.secondaryText, { color: colors.text }]}>Back to Loose</Text>
            <Text style={[styles.secondaryHint, { color: colors.textSecondary }]}>
              No clock — pick it up later
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancel} hitSlop={8}>
            <Text style={{ color: colors.textSecondary, fontFamily: Fonts.bodyMedium }}>
              Not yet
            </Text>
          </Pressable>
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
    marginBottom: 8,
  },
  lead: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 13,
    marginBottom: 16,
  },
  primary: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  primaryText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 17,
    marginBottom: 2,
  },
  primaryHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    opacity: 0.85,
  },
  secondary: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  secondaryText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 17,
    marginBottom: 2,
  },
  secondaryHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
});
