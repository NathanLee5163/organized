import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/Colors';
import { useThemeColors } from '@/src/components/useThemeColors';
import { hapticSelection } from '@/src/utils/haptics';

export const WHEEL_ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;

type Item = {
  label: string;
  value: number | string;
};

type WheelPickerProps = {
  items: Item[];
  value: number | string;
  onChange: (value: number | string) => void;
  width?: number;
};

function WheelItem({
  label,
  index,
  scrollY,
  color,
}: {
  label: string;
  index: number;
  scrollY: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const center = scrollY.value / WHEEL_ITEM_HEIGHT;
    const distance = Math.abs(center - index);
    const opacity = interpolate(
      distance,
      [0, 0.5, 1.2, 2.2],
      [1, 0.55, 0.28, 0.12],
      Extrapolation.CLAMP
    );
    const scale = interpolate(distance, [0, 1, 2], [1.08, 0.94, 0.88], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.item, style]}>
      <Text style={[styles.itemText, { color }]}>{label}</Text>
    </Animated.View>
  );
}

export function WheelPicker({ items, value, onChange, width = 72 }: WheelPickerProps) {
  const colors = useThemeColors();
  const listRef = useRef<Animated.ScrollView>(null);
  const lastIndex = useRef(-1);
  const didInitialScroll = useRef(false);

  const selectedIndex = useMemo(() => {
    const idx = items.findIndex((item) => item.value === value);
    return idx >= 0 ? idx : 0;
  }, [items, value]);

  const scrollY = useSharedValue(selectedIndex * WHEEL_ITEM_HEIGHT);
  const pad = Math.floor(VISIBLE_ROWS / 2);
  const contentPad = pad * WHEEL_ITEM_HEIGHT;

  const jumpToIndex = (index: number) => {
    const y = index * WHEEL_ITEM_HEIGHT;
    scrollY.value = y;
    listRef.current?.scrollTo({ y, animated: false });
  };

  useEffect(() => {
    jumpToIndex(selectedIndex);
    lastIndex.current = selectedIndex;

    // Modal / nested ScrollView often aren't ready on the first frame.
    const frames = [
      requestAnimationFrame(() => jumpToIndex(selectedIndex)),
      requestAnimationFrame(() => {
        requestAnimationFrame(() => jumpToIndex(selectedIndex));
      }),
    ];
    const timers = [50, 150, 320].map((ms) =>
      setTimeout(() => jumpToIndex(selectedIndex), ms)
    );

    didInitialScroll.current = true;

    return () => {
      frames.forEach((id) => cancelAnimationFrame(id));
      timers.forEach((id) => clearTimeout(id));
    };
    // Only re-sync when the selected value changes, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const emitChange = (index: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    if (clamped === lastIndex.current) return;
    lastIndex.current = clamped;
    if (Platform.OS !== 'web') {
      hapticSelection();
    }
    onChange(items[clamped].value);
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const settle = (offsetY: number) => {
    const index = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
    emitChange(index);
  };

  return (
    <View
      style={[
        styles.wheel,
        {
          width,
          height: WHEEL_ITEM_HEIGHT * VISIBLE_ROWS,
          backgroundColor: colors.bubble,
          borderColor: colors.hairline,
        },
      ]}
      onLayout={() => {
        if (!didInitialScroll.current) return;
        jumpToIndex(selectedIndex);
      }}>
      <View
        pointerEvents="none"
        style={[
          styles.selection,
          {
            top: contentPad,
            height: WHEEL_ITEM_HEIGHT,
            backgroundColor: colors.tint + '33',
          },
        ]}
      />
      <Animated.ScrollView
        ref={listRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        disableIntervalMomentum
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentOffset={{ x: 0, y: selectedIndex * WHEEL_ITEM_HEIGHT }}
        contentContainerStyle={{ paddingVertical: contentPad }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          if (Platform.OS === 'web') {
            settle(e.nativeEvent.contentOffset.y);
          }
        }}>
        {items.map((item, index) => (
          <WheelItem
            key={`${item.value}-${index}`}
            label={item.label}
            index={index}
            scrollY={scrollY}
            color={colors.text}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selection: {
    position: 'absolute',
    left: 6,
    right: 6,
    borderRadius: 14,
    zIndex: 0,
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 20,
    letterSpacing: -0.3,
  },
});
