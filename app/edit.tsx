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
import {
  formatDisplayDate,
  startOfMonth,
  toDateKey,
} from '@/src/utils/dates';
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
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    kind?: string;
    inbox?: string;
  }>();
  const { getTodo, addTodo, updateTodo, updateTodoScoped, removeTodo, dateKey, markedDates } =
    useTodos();

  const openingAsInbox = params.inbox === '1' || params.kind === 'anytime';
  const occurrenceDate = params.date ?? dateKey ?? toDateKey(new Date());

  const [loading, setLoading] = useState(Boolean(params.id));
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(occurrenceDate);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(occurrenceDate));
  const [inboxMode, setInboxMode] = useState(openingAsInbox);
  const [anytime, setAnytime] = useState(openingAsInbox);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(30);
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [recurrence, setRecurrence] = useState<Recurrence>(NO_REPEAT);
  const [seriesStartDate, setSeriesStartDate] = useState(occurrenceDate);
  const [existingId, setExistingId] = useState<string | null>(params.id ?? null);
  const [googleEventId, setGoogleEventId] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [exdates, setExdates] = useState<string[]>([]);
  const [dockedFromLoose, setDockedFromLoose] = useState(false);
  const [dockCount, setDockCount] = useState(0);
  const [goalId, setGoalId] = useState<string | null>(null);

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
      setSeriesStartDate(todo.date);
      const openOn = params.date ?? todo.date;
      setDate(openOn);
      setMonthCursor(startOfMonth(openOn));
      setInboxMode(todo.inbox);
      setAnytime(todo.kind === 'anytime' || todo.inbox);
      if (todo.startMinutes != null) {
        setHour(Math.floor(todo.startMinutes / 60));
        setMinute(todo.startMinutes % 60);
      }
      setDuration(todo.durationMinutes);
      setRecurrence(parseRecurrence(todo.recurrence, todo.date));
      setGoogleEventId(todo.googleEventId);
      setCalendarId(todo.calendarId);
      setCompleted(todo.completed);
      setExdates(todo.exdates ?? []);
      setDockedFromLoose(todo.dockedFromLoose ?? false);
      setDockCount(todo.dockCount ?? 0);
      setGoalId(todo.goalId ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [getTodo, params.date, params.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: inboxMode
        ? existingId
          ? 'Edit loose end'
          : 'New loose end'
        : existingId
          ? 'Edit task'
          : 'New task',
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: {
        fontFamily: Fonts.bodyMedium,
        color: colors.text,
      },
    });
  }, [colors.background, colors.text, existingId, inboxMode, navigation]);

  const kind: TodoKind = inboxMode || anytime ? 'anytime' : 'timed';
  const startMinutes = inboxMode || anytime ? null : hour * 60 + minute;
  const canSave = useMemo(() => title.trim().length > 0, [title]);
  const recurrenceRule = inboxMode ? null : serializeRecurrence(recurrence);
  const isRepeating = !inboxMode && recurrence.preset !== 'none';

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

  const setLooseList = (on: boolean) => {
    setInboxMode(on);
    setAnytime(on);
    if (on) setRecurrence(NO_REPEAT);
  };

  const buildPayload = () => ({
    id: existingId!,
    title: title.trim(),
    date: inboxMode ? seriesStartDate || date : seriesStartDate,
    kind,
    startMinutes,
    durationMinutes: duration,
    recurrence: recurrenceRule,
    exdates: inboxMode ? [] : exdates,
    inbox: inboxMode,
    dockedFromLoose: inboxMode ? false : dockedFromLoose,
    dockCount,
    goalId,
    completed,
    calendarId: inboxMode ? null : calendarId,
    googleEventId: inboxMode ? null : googleEventId,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  });

  const saveSeries = async () => {
    await updateTodo({
      ...buildPayload(),
      date: existingId ? seriesStartDate : date,
      recurrence: recurrenceRule,
    });
  };

  const saveOccurrence = async () => {
    await updateTodoScoped(
      {
        ...buildPayload(),
        date,
        recurrence: null,
        inbox: false,
      },
      'occurrence',
      date
    );
  };

  const onSave = async () => {
    if (!canSave) return;
    try {
      if (!existingId) {
        await addTodo({
          title: title.trim(),
          date: inboxMode ? toDateKey(new Date()) : date,
          kind,
          startMinutes,
          durationMinutes: duration,
          recurrence: recurrenceRule,
          inbox: inboxMode,
          calendarId: inboxMode ? null : calendarId,
        });
        router.back();
        return;
      }

      if (isRepeating) {
        Alert.alert('Save changes', 'Apply edits to this day only, or the entire repeating series?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'This day',
            onPress: async () => {
              try {
                await saveOccurrence();
                router.back();
              } catch (e) {
                Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
              }
            },
          },
          {
            text: 'Entire series',
            onPress: async () => {
              try {
                await saveSeries();
                router.back();
              } catch (e) {
                Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
              }
            },
          },
        ]);
        return;
      }

      await updateTodo({
        ...buildPayload(),
        date: inboxMode ? seriesStartDate || date : date,
      });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const onDelete = () => {
    if (!existingId) return;
    if (isRepeating) {
      Alert.alert('Delete repeating task', 'Remove only this day, or the entire series?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'This day',
          style: 'destructive',
          onPress: async () => {
            await removeTodo(existingId, { scope: 'occurrence', occurrenceDate: date });
            router.back();
          },
        },
        {
          text: 'Entire series',
          style: 'destructive',
          onPress: async () => {
            await removeTodo(existingId, { scope: 'series' });
            router.back();
          },
        },
      ]);
      return;
    }

    Alert.alert(
      'Delete task',
      inboxMode
        ? 'Remove this from your loose list?'
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
      ]
    );
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
            placeholder={inboxMode ? 'What do you need to get done?' : 'What needs doing?'}
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

          <View
            style={[
              styles.switchRow,
              { backgroundColor: colors.bubble, borderColor: colors.hairline },
            ]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Loose list</Text>
              <Text style={{ color: colors.textSecondary, fontFamily: Fonts.body, fontSize: 13 }}>
                No clock, no day — stays open until you finish it
              </Text>
            </View>
            <Switch
              value={inboxMode}
              onValueChange={setLooseList}
              trackColor={{ true: colors.tint, false: colors.border }}
              thumbColor="#F7F8FA"
            />
          </View>

          {inboxMode ? (
            <Text
              style={[
                styles.anytimeHint,
                {
                  color: colors.textSecondary,
                  backgroundColor: colors.bubble,
                  borderColor: colors.hairline,
                },
              ]}>
              Lives on Loose until you check it off. Not parked on the runway or Google Calendar.
            </Text>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Date · {formatDisplayDate(date)}
                {isRepeating ? ' · repeating' : ''}
              </Text>
              <MiniMonthCalendar
                compact
                selectedDate={date}
                onSelectDate={onChangeDate}
                monthCursor={monthCursor}
                onMonthChange={setMonthCursor}
                markedDates={markedDates}
              />

              <RepeatPicker dateKey={date} value={recurrence} onChange={setRecurrence} />
              <CategoryPicker value={calendarId} onChange={setCalendarId} />

              <AlarmTimePickers
                hour24={hour}
                minute={minute}
                duration={duration}
                onHourChange={setHour}
                onMinuteChange={setMinute}
                onDurationChange={setDuration}
              />
            </>
          )}
        </Animated.View>

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
              {existingId ? 'Save' : inboxMode ? 'Add to Loose' : 'Add task'}
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
