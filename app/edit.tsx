import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Fonts } from '@/constants/Colors';
import { AlarmTimePickers } from '@/src/components/AlarmTimePickers';
import { CategoryPicker } from '@/src/components/CategoryPicker';
import { MiniMonthCalendar } from '@/src/components/MiniMonthCalendar';
import { PressableScale } from '@/src/components/PressableScale';
import { RepeatPicker } from '@/src/components/RepeatPicker';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { useTodos } from '@/src/context/TodoContext';
import { usePreferences } from '@/src/preferences/PreferencesContext';
import type { TodoKind } from '@/src/types/todo';
import { formatDisplayDate, startOfMonth, toDateKey } from '@/src/utils/dates';
import {
  NO_REPEAT,
  type Recurrence,
  parseRecurrence,
  recurrenceFromPreset,
  serializeRecurrence,
} from '@/src/utils/recurrence';

export default function EditScreen() {
  const colors = useThemeColors();
  const { defaultDuration } = usePreferences();
  const { writeCalendarId } = useCalendars();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string; date?: string; kind?: string }>();
  const { getTodo, addTodo, updateTodo, removeTodo, dateKey, markedDates } = useTodos();

  const [loading, setLoading] = useState(Boolean(params.id));
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(params.date ?? dateKey ?? toDateKey(new Date()));
  const [monthCursor, setMonthCursor] = useState(
    startOfMonth(params.date ?? dateKey ?? toDateKey(new Date()))
  );
  const [anytime, setAnytime] = useState(params.kind === 'anytime');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(30);
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [recurrence, setRecurrence] = useState<Recurrence>(NO_REPEAT);
  const [seriesStartDate, setSeriesStartDate] = useState(
    params.date ?? dateKey ?? toDateKey(new Date())
  );
  const [existingId, setExistingId] = useState<string | null>(params.id ?? null);
  const [googleEventId, setGoogleEventId] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!params.id && writeCalendarId && !calendarId) {
      setCalendarId(writeCalendarId);
    }
  }, [calendarId, params.id, writeCalendarId]);

  useEffect(() => {
    if (!params.id) {
      setDuration(defaultDuration);
    }
  }, [defaultDuration, params.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!params.id) {
        setLoading(false);
        return;
      }
      const todo = await getTodo(params.id);
      if (cancelled || !todo) {
        setLoading(false);
        return;
      }
      setExistingId(todo.id);
      setTitle(todo.title);
      setDate(todo.date);
      setSeriesStartDate(todo.date);
      setMonthCursor(startOfMonth(todo.date));
      setAnytime(todo.kind === 'anytime');
      if (todo.startMinutes != null) {
        setHour(Math.floor(todo.startMinutes / 60));
        setMinute(todo.startMinutes % 60);
      }
      setDuration(todo.durationMinutes);
      setRecurrence(parseRecurrence(todo.recurrence, todo.date));
      setGoogleEventId(todo.googleEventId);
      setCalendarId(todo.calendarId);
      setCompleted(todo.completed);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [getTodo, params.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: existingId ? 'Edit task' : 'New task',
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: {
        fontFamily: Fonts.bodyMedium,
        color: colors.text,
      },
    });
  }, [colors.background, colors.text, existingId, navigation]);

  const kind: TodoKind = anytime ? 'anytime' : 'timed';
  const startMinutes = anytime ? null : hour * 60 + minute;
  const canSave = useMemo(() => title.trim().length > 0, [title]);
  const recurrenceRule = serializeRecurrence(recurrence);

  const onChangeDate = (next: string) => {
    setDate(next);
    setMonthCursor(startOfMonth(next));
    if (!existingId) {
      setSeriesStartDate(next);
      if (recurrence.preset === 'weekly') {
        setRecurrence(recurrenceFromPreset('weekly', next));
      } else if (recurrence.preset === 'custom' && recurrence.daysOfWeek.length <= 1) {
        setRecurrence(recurrenceFromPreset('custom', next));
      }
    }
  };

  const onSave = async () => {
    if (!canSave) return;
    const anchorDate = existingId ? seriesStartDate : date;
    try {
      if (existingId) {
        await updateTodo({
          id: existingId,
          title: title.trim(),
          date: anchorDate,
          kind,
          startMinutes,
          durationMinutes: duration,
          recurrence: recurrenceRule,
          completed,
          calendarId,
          googleEventId,
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        });
      } else {
        await addTodo({
          title: title.trim(),
          date: anchorDate,
          kind,
          startMinutes,
          durationMinutes: duration,
          recurrence: recurrenceRule,
          calendarId,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const onDelete = () => {
    if (!existingId) return;
    Alert.alert(
      'Delete task',
      recurrence.preset !== 'none'
        ? 'Remove this repeating task (entire series) from the app and Google Calendar?'
        : 'Remove this task from the app and Google Calendar?',
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTodo(existingId);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, fontFamily: Fonts.body }}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        <Animated.View entering={FadeIn.duration(220)}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: colors.bubble,
                borderColor: colors.hairline,
                color: colors.text,
              },
            ]}
            autoFocus={!existingId}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Date · {formatDisplayDate(date)}
          </Text>
          <MiniMonthCalendar
            compact
            selectedDate={date}
            onSelectDate={onChangeDate}
            monthCursor={monthCursor}
            onMonthChange={setMonthCursor}
            markedDates={markedDates}
          />

          <View
            style={[
              styles.switchRow,
              { backgroundColor: colors.bubble, borderColor: colors.hairline },
            ]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Anytime</Text>
              <Text style={{ color: colors.textSecondary, fontFamily: Fonts.body, fontSize: 13 }}>
                No clock time · syncs as an all-day event
              </Text>
            </View>
            <Switch
              value={anytime}
              onValueChange={setAnytime}
              trackColor={{ true: colors.tint, false: colors.border }}
              thumbColor="#F7F8FA"
            />
          </View>

          <RepeatPicker dateKey={date} value={recurrence} onChange={setRecurrence} />

          <CategoryPicker value={calendarId} onChange={setCalendarId} />
        </Animated.View>

        <View>
          {!anytime ? (
            <AlarmTimePickers
              hour24={hour}
              minute={minute}
              duration={duration}
              onHourChange={setHour}
              onMinuteChange={setMinute}
              onDurationChange={setDuration}
            />
          ) : (
            <Text
              style={[
                styles.anytimeHint,
                {
                  color: colors.textSecondary,
                  backgroundColor: colors.bubble,
                  borderColor: colors.hairline,
                },
              ]}>
              This will sit in Anytime and sync as an all-day calendar event.
            </Text>
          )}
        </View>

        <View>
          <PressableScale
            onPress={onSave}
            disabled={!canSave}
            style={[
              styles.save,
              {
                backgroundColor: colors.tint,
                opacity: canSave ? 1 : 0.4,
              },
            ]}>
            <Text style={[styles.saveText, { color: colors.onTint }]}>
              {existingId ? 'Save' : 'Add task'}
            </Text>
          </PressableScale>

          {existingId ? (
            <PressableScale onPress={onDelete} style={styles.delete} scaleTo={0.96}>
              <Text style={{ color: colors.danger, fontFamily: Fonts.bodyMedium }}>Delete</Text>
            </PressableScale>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 22,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  switchTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    marginBottom: 2,
  },
  anytimeHint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  save: {
    marginTop: 32,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
  },
  delete: {
    marginTop: 18,
    alignItems: 'center',
    padding: 10,
  },
});
