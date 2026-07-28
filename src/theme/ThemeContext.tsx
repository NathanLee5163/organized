import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_LIST,
  isThemeId,
  type AppTheme,
  type ThemeId,
  type ThemePalette,
} from '@/constants/themes';

const THEME_KEY = 'organized_theme_id';

type ThemeContextValue = {
  themeId: ThemeId;
  theme: AppTheme;
  colors: ThemePalette;
  themes: AppTheme[];
  setThemeId: (id: ThemeId) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (!cancelled && isThemeId(stored)) {
          setThemeIdState(stored);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_KEY, id).catch(() => undefined);
  }, []);

  const theme = THEMES[themeId];

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme,
      colors: theme.colors,
      themes: THEME_LIST,
      setThemeId,
      ready,
    }),
    [themeId, theme, setThemeId, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx;
}
