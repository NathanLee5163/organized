import { THEMES, DEFAULT_THEME_ID } from '@/constants/themes';

/** @deprecated Prefer useThemeColors() — kept for legacy Themed helpers. */
const fallback = THEMES[DEFAULT_THEME_ID].colors;

export default {
  light: fallback,
  dark: fallback,
};

export const Fonts = {
  display: 'Fraunces_600SemiBold',
  displaySoft: 'Fraunces_500Medium',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
};
