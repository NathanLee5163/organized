import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/Colors';
import { useCalendars } from '@/src/calendar/CalendarContext';
import { useThemeColors } from '@/src/components/useThemeColors';
import { useAuth } from '@/src/auth/AuthContext';

type Props = {
  value: string | null;
  onChange: (id: string) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const colors = useThemeColors();
  const { isSignedIn } = useAuth();
  const { calendars, writeCalendarId } = useCalendars();

  if (!isSignedIn || calendars.length === 0) return null;

  const selected = value ?? writeCalendarId ?? calendars[0]?.id ?? null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bubble, borderColor: colors.hairline },
        ]}>
        {calendars.map((cal, index) => {
          const on = selected === cal.id;
          const tint = cal.backgroundColor ?? colors.tint;
          const last = index === calendars.length - 1;
          return (
            <Pressable
              key={cal.id}
              onPress={() => onChange(cal.id)}
              style={[
                styles.row,
                !last && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.hairline,
                },
              ]}>
              <View style={[styles.dot, { backgroundColor: tint }]} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.name,
                    {
                      color: colors.text,
                      fontFamily: on ? Fonts.bodySemi : Fonts.body,
                    },
                  ]}>
                  {cal.summary}
                </Text>
                {cal.primary ? (
                  <Text style={{ color: colors.textSecondary, fontFamily: Fonts.body, fontSize: 12 }}>
                    Primary
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: on ? tint : colors.border,
                    backgroundColor: on ? tint : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  name: {
    fontSize: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
});
