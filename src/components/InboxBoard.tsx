import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Fonts } from '@/constants/Colors';
import { PressableScale } from '@/src/components/PressableScale';
import { useThemeColors } from '@/src/components/useThemeColors';
import type { Todo } from '@/src/types/todo';
import { hapticLight } from '@/src/utils/haptics';

type Props = {
  todos: Todo[];
  onPressTodo: (todo: Todo) => void;
  onToggleTodo: (id: string) => void;
  onAdd: () => void;
  onDockTodo?: (todo: Todo) => void;
};

/** Open-ended checklist — no clocks, no days. */
export function InboxBoard({ todos, onPressTodo, onToggleTodo, onAdd, onDockTodo }: Props) {
  const colors = useThemeColors();
  const open = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  if (todos.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(220)} style={styles.emptyWrap}>
        <View style={[styles.heroCard, { backgroundColor: colors.muted, borderColor: colors.hairline }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', colors.night + '22', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Loose</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing open</Text>
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
            Park errands and ideas here with no clock. When you’re ready, tap Dock to land one on
            the runway — any day this week.
          </Text>
          <PressableScale
            onPress={onAdd}
            style={[styles.emptyCta, { backgroundColor: colors.tint }]}>
            <Text style={[styles.emptyCtaText, { color: colors.onTint }]}>Add a loose end</Text>
          </PressableScale>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.headerCard, { backgroundColor: colors.muted, borderColor: colors.hairline }]}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.night + '18', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Loose</Text>
            <Text style={[styles.headline, { color: colors.text }]}>
              {open.length === 0
                ? 'All clear'
                : open.length === 1
                  ? '1 open'
                  : `${open.length} open`}
            </Text>
          </View>
          <PressableScale
            onPress={onAdd}
            style={[styles.addPill, { borderColor: colors.hairline, backgroundColor: colors.bubble }]}>
            <Text style={[styles.addPillText, { color: colors.text }]}>+ Add</Text>
          </PressableScale>
        </View>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          No schedule — finish whenever. Dock parks one on a day’s runway.
        </Text>
      </View>

      <View style={styles.list}>
        {open.map((todo) => (
          <InboxRow
            key={todo.id}
            todo={todo}
            accent={colors.night}
            onPress={() => onPressTodo(todo)}
            onToggle={() => onToggleTodo(todo.id)}
            onDock={
              onDockTodo
                ? () => {
                    hapticLight();
                    onDockTodo(todo);
                  }
                : undefined
            }
          />
        ))}
      </View>

      {done.length > 0 ? (
        <View style={styles.doneSection}>
          <Text style={[styles.doneLabel, { color: colors.textSecondary }]}>
            Done · {done.length}
          </Text>
          {done.map((todo) => (
            <InboxRow
              key={todo.id}
              todo={todo}
              accent={colors.night}
              faded
              onPress={() => onPressTodo(todo)}
              onToggle={() => onToggleTodo(todo.id)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InboxRow({
  todo,
  accent,
  onPress,
  onToggle,
  onDock,
  faded,
}: {
  todo: Todo;
  accent: string;
  onPress: () => void;
  onToggle: () => void;
  onDock?: () => void;
  faded?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.rowCard,
        {
          backgroundColor: colors.bubble,
          borderColor: colors.hairline,
          opacity: faded ? 0.72 : 1,
        },
      ]}>
      <View style={[styles.stripe, { backgroundColor: accent }]} />
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.completed }}
        style={[
          styles.check,
          {
            borderColor: todo.completed ? accent : colors.border,
            backgroundColor: todo.completed ? accent : 'transparent',
          },
        ]}>
        {todo.completed ? (
          <Text style={[styles.checkMark, { color: colors.onTint }]}>✓</Text>
        ) : null}
      </Pressable>

      <Pressable onPress={onPress} style={styles.titleHit}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              textDecorationLine: todo.completed ? 'line-through' : 'none',
              opacity: todo.completed ? 0.45 : 1,
            },
          ]}
          numberOfLines={3}>
          {todo.title}
        </Text>
        {(todo.dockCount ?? 0) > 0 ? (
          <Text style={[styles.dockMeta, { color: colors.textSecondary }]}>
            Docked {todo.dockCount}×
          </Text>
        ) : null}
      </Pressable>

      {onDock ? (
        <Pressable
          onPress={onDock}
          hitSlop={6}
          accessibilityLabel="Dock to runway"
          style={[styles.dockBtn, { borderColor: colors.hairline, backgroundColor: colors.muted }]}>
          <Text style={[styles.dockBtnText, { color: colors.tint }]}>Dock</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    paddingBottom: 8,
  },
  headerCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  addPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  addPillText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
  },
  list: {
    gap: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingRight: 10,
    paddingLeft: 0,
    overflow: 'hidden',
    gap: 12,
  },
  stripe: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    marginTop: -1,
  },
  titleHit: {
    flex: 1,
    paddingVertical: 2,
  },
  title: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    letterSpacing: -0.25,
    lineHeight: 22,
  },
  dockMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 3,
  },
  dockBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dockBtnText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
  },
  doneSection: {
    marginTop: 28,
    gap: 10,
  },
  doneLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  emptyWrap: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    overflow: 'hidden',
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  emptyCopy: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 20,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyCtaText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
  },
});
