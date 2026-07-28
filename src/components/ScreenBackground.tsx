import { StyleSheet, View, type ViewProps } from 'react-native';

import { useThemeColors } from '@/src/components/useThemeColors';

type Props = ViewProps & {
  children: React.ReactNode;
};

export function ScreenBackground({ children, style, ...rest }: Props) {
  const colors = useThemeColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
