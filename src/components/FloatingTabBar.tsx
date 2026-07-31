import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/components/useThemeColors';
import { useTodos } from '@/src/context/TodoContext';
import { PressableScale } from '@/src/components/PressableScale';

type Route = {
  key: string;
  name: string;
  params?: object;
};

type Props = {
  state: {
    index: number;
    routes: Route[];
  };
  descriptors: Record<
    string,
    {
      options: {
        tabBarLabel?: string | ((props: unknown) => React.ReactNode);
        title?: string;
      };
    }
  >;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

function TabIcon({ routeName, focused }: { routeName: string; focused: boolean }) {
  const colors = useThemeColors();
  const iconName =
    routeName === 'calendar'
      ? ({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' } as const)
      : routeName === 'anytime'
        ? ({ ios: 'flag.fill', android: 'flag', web: 'flag' } as const)
        : routeName === 'settings'
          ? ({ ios: 'gearshape', android: 'settings', web: 'settings' } as const)
          : ({
              ios: 'list.bullet.rectangle',
              android: 'view_agenda',
              web: 'view_agenda',
            } as const);

  return (
    <View style={styles.iconWrap}>
      <View
        style={[
          styles.activePill,
          {
            backgroundColor: colors.muted,
            opacity: focused ? 1 : 0,
            transform: [{ scale: focused ? 1 : 0.85 }],
          },
        ]}
      />
      <SymbolView
        name={iconName}
        tintColor={focused ? colors.tint : colors.tabIconDefault}
        size={21}
      />
    </View>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dateKey } = useTodos();
  const focusedRoute = state.routes[state.index]?.name;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { backgroundColor: colors.surfaceSolid, borderColor: colors.hairline }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={styles.item}>
              <TabIcon routeName={route.name} focused={focused} />
            </Pressable>
          );
        })}

        <PressableScale
          onPress={() =>
            router.push(
              focusedRoute === 'anytime'
                ? { pathname: '/(tabs)/anytime', params: { new: '1' } }
                : { pathname: '/edit', params: { date: dateKey } }
            )
          }
          style={styles.fabOuter}
          scaleTo={0.92}>
          <LinearGradient
            colors={[...colors.fabGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}>
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              tintColor={colors.onTint}
              size={22}
            />
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  iconWrap: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
  },
  fabOuter: {
    marginLeft: 4,
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
