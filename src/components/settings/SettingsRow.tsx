import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';

type IconName = {
  ios: string;
  android: string;
  web: string;
};

type BaseProps = {
  label: string;
  subtitle?: string;
  last?: boolean;
  icon?: IconName;
  iconColor?: string;
};

type NavProps = BaseProps & {
  kind?: 'nav' | 'button';
  value?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

type ToggleProps = BaseProps & {
  kind: 'toggle';
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

type Props = NavProps | ToggleProps;

export function SettingsRow(props: Props) {
  const colors = useThemeColors();
  const { label, subtitle, last, icon, iconColor } = props;

  const body = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: iconColor ?? colors.tint }]}>
          <SymbolView name={icon as never} tintColor="#fff" size={16} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text
          style={[
            styles.label,
            {
              color:
                'destructive' in props && props.destructive ? colors.danger : colors.text,
            },
          ]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>

      {props.kind === 'toggle' ? (
        <Switch
          value={props.value}
          onValueChange={props.onValueChange}
          disabled={props.disabled}
          trackColor={{ true: colors.tint, false: colors.border }}
          thumbColor="#F7F8FA"
        />
      ) : (
        <View style={styles.trailing}>
          {props.value ? (
            <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>
              {props.value}
            </Text>
          ) : null}
          {props.onPress && !props.destructive ? (
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          ) : null}
        </View>
      )}
    </>
  );

  if (props.kind === 'toggle') {
    return (
      <View
        style={[
          styles.row,
          !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
        ]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      disabled={props.disabled || !props.onPress}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
        pressed && props.onPress ? { backgroundColor: colors.muted } : null,
        props.disabled ? { opacity: 0.55 } : null,
      ]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '40%',
  },
  value: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'right',
  },
  chevron: {
    fontFamily: Fonts.body,
    fontSize: 22,
    lineHeight: 22,
    marginTop: -1,
  },
});
