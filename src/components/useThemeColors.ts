import { useAppTheme } from '@/src/theme/ThemeContext';

export function useThemeColors() {
  return useAppTheme().colors;
}
