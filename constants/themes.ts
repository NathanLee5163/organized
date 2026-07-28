export type ThemeId =
  | 'minimal'
  | 'coral'
  | 'volt'
  | 'ocean'
  | 'sunset'
  | 'lilac'
  | 'rainbow';

export type ThemePalette = {
  text: string;
  textSecondary: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceSolid: string;
  border: string;
  tint: string;
  tintSoft: string;
  night: string;
  nightSoft: string;
  tabIconDefault: string;
  tabIconSelected: string;
  danger: string;
  success: string;
  scheduleAccent: string;
  anytimeAccent: string;
  muted: string;
  hairline: string;
  overlay: string;
  bubble: string;
  timelineCard: string;
  checkRing: string;
  checkRingNight: string;
  spine: string;
  spineFade: string;
  accentApricot: string;
  fabGradient: readonly [string, string];
  chipColors: readonly string[];
  onTint: string;
};

export type AppTheme = {
  id: ThemeId;
  name: string;
  blurb: string;
  swatches: readonly [string, string, string];
  colors: ThemePalette;
};

function palette(partial: ThemePalette): ThemePalette {
  return partial;
}

export const THEMES: Record<ThemeId, AppTheme> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    blurb: 'Quiet ink · soft silver accent',
    swatches: ['#F4F4F5', '#8A8A93', '#161618'],
    colors: palette({
      text: '#F4F4F5',
      textSecondary: '#8A8A93',
      background: '#161618',
      backgroundAlt: '#1C1C1E',
      surface: '#222226',
      surfaceSolid: '#1C1C1E',
      border: '#2A2A2E',
      tint: '#E8E8EC',
      tintSoft: '#C8C8D0',
      night: '#A0A0AA',
      nightSoft: '#C4C4CC',
      tabIconDefault: '#6A6A72',
      tabIconSelected: '#E8E8EC',
      danger: '#E07A7A',
      success: '#7AAB90',
      scheduleAccent: '#E8E8EC',
      anytimeAccent: '#A0A0AA',
      muted: '#222226',
      hairline: 'rgba(255,255,255,0.08)',
      overlay: 'rgba(22,22,24,0.55)',
      bubble: '#222226',
      timelineCard: '#1C1C1E',
      checkRing: '#E8E8EC',
      checkRingNight: '#A0A0AA',
      spine: '#E8E8EC',
      spineFade: '#6A6A72',
      accentApricot: '#C8C8D0',
      fabGradient: ['#F0F0F4', '#C8C8D0'],
      chipColors: ['#E8E8EC', '#B8B8C0', '#9898A0', '#D0D0D8', '#A8A8B0', '#C0C0C8'],
      onTint: '#161618',
    }),
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    blurb: 'Warm salmon · night-sky blue',
    swatches: ['#E8836F', '#7BA3C4', '#181818'],
    colors: palette({
      text: '#F5F5F5',
      textSecondary: '#9A9A9A',
      background: '#181818',
      backgroundAlt: '#1E1E1E',
      surface: '#262626',
      surfaceSolid: '#202020',
      border: '#2E2E2E',
      tint: '#E8836F',
      tintSoft: '#F0A090',
      night: '#7BA3C4',
      nightSoft: '#A8C5D9',
      tabIconDefault: '#6F6F6F',
      tabIconSelected: '#E8836F',
      danger: '#D97B7B',
      success: '#7DAB90',
      scheduleAccent: '#E8836F',
      anytimeAccent: '#7BA3C4',
      muted: '#2A2A2A',
      hairline: 'rgba(255,255,255,0.08)',
      overlay: 'rgba(24,24,24,0.5)',
      bubble: '#262626',
      timelineCard: '#202020',
      checkRing: '#E8836F',
      checkRingNight: '#7BA3C4',
      spine: '#E8836F',
      spineFade: '#7BA3C4',
      accentApricot: '#F0A090',
      fabGradient: ['#E8836F', '#D96A55'],
      chipColors: ['#E8836F', '#7BA3C4', '#F0A090', '#7DAB90', '#D97B7B', '#A8C5D9'],
      onTint: '#FFFFFF',
    }),
  },
  volt: {
    id: 'volt',
    name: 'Volt',
    blurb: 'Chartreuse punch · lilac night',
    swatches: ['#B8F24A', '#C4A8FF', '#16141C'],
    colors: palette({
      text: '#F2F0FA',
      textSecondary: '#9B96AD',
      background: '#16141C',
      backgroundAlt: '#1C1A24',
      surface: '#262232',
      surfaceSolid: '#201C2A',
      border: '#2E2A3D',
      tint: '#B8F24A',
      tintSoft: '#D4FF7A',
      night: '#C4A8FF',
      nightSoft: '#E0D4FF',
      tabIconDefault: '#6E687F',
      tabIconSelected: '#B8F24A',
      danger: '#FF7A8A',
      success: '#6EE7A8',
      scheduleAccent: '#B8F24A',
      anytimeAccent: '#C4A8FF',
      muted: '#2A2638',
      hairline: 'rgba(242,240,250,0.09)',
      overlay: 'rgba(22,20,28,0.55)',
      bubble: '#262232',
      timelineCard: '#201C2A',
      checkRing: '#B8F24A',
      checkRingNight: '#C4A8FF',
      spine: '#B8F24A',
      spineFade: '#C4A8FF',
      accentApricot: '#FF9F6B',
      fabGradient: ['#B8F24A', '#8BE04A'],
      chipColors: ['#B8F24A', '#C4A8FF', '#FF9F6B', '#6EE7A8', '#7EC8FF', '#FF7A8A'],
      onTint: '#16141C',
    }),
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    blurb: 'Deep teal · seafoam glow',
    swatches: ['#3DD6C3', '#5B8DEF', '#101820'],
    colors: palette({
      text: '#E8F4F8',
      textSecondary: '#8AAAB8',
      background: '#101820',
      backgroundAlt: '#162028',
      surface: '#1A2A36',
      surfaceSolid: '#162430',
      border: '#243440',
      tint: '#3DD6C3',
      tintSoft: '#7EE8DB',
      night: '#5B8DEF',
      nightSoft: '#9BB8F5',
      tabIconDefault: '#5A7080',
      tabIconSelected: '#3DD6C3',
      danger: '#E07A8A',
      success: '#5ECF9A',
      scheduleAccent: '#3DD6C3',
      anytimeAccent: '#5B8DEF',
      muted: '#1A2A35',
      hairline: 'rgba(232,244,248,0.09)',
      overlay: 'rgba(16,24,32,0.55)',
      bubble: '#1A2A36',
      timelineCard: '#162430',
      checkRing: '#3DD6C3',
      checkRingNight: '#5B8DEF',
      spine: '#3DD6C3',
      spineFade: '#5B8DEF',
      accentApricot: '#7EE8DB',
      fabGradient: ['#3DD6C3', '#2BB8A8'],
      chipColors: ['#3DD6C3', '#5B8DEF', '#7EE8DB', '#5ECF9A', '#9BB8F5', '#4AA8C8'],
      onTint: '#101820',
    }),
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    blurb: 'Apricot dusk · rose evening',
    swatches: ['#FF9F6B', '#E86B8A', '#1A1416'],
    colors: palette({
      text: '#FFF2EC',
      textSecondary: '#B0A09A',
      background: '#1A1416',
      backgroundAlt: '#221A1C',
      surface: '#2A2022',
      surfaceSolid: '#221A1C',
      border: '#3A2C2E',
      tint: '#FF9F6B',
      tintSoft: '#FFB890',
      night: '#E86B8A',
      nightSoft: '#F0A0B4',
      tabIconDefault: '#7A6868',
      tabIconSelected: '#FF9F6B',
      danger: '#FF6B7A',
      success: '#8ABB90',
      scheduleAccent: '#FF9F6B',
      anytimeAccent: '#E86B8A',
      muted: '#2E2224',
      hairline: 'rgba(255,242,236,0.09)',
      overlay: 'rgba(26,20,22,0.55)',
      bubble: '#2A2022',
      timelineCard: '#221A1C',
      checkRing: '#FF9F6B',
      checkRingNight: '#E86B8A',
      spine: '#FF9F6B',
      spineFade: '#E86B8A',
      accentApricot: '#FFB890',
      fabGradient: ['#FF9F6B', '#E86B8A'],
      chipColors: ['#FF9F6B', '#E86B8A', '#FFB890', '#F0A0B4', '#FF7A6B', '#D98A70'],
      onTint: '#1A1416',
    }),
  },
  lilac: {
    id: 'lilac',
    name: 'Lilac',
    blurb: 'Soft violet · lavender hush',
    swatches: ['#C4A8FF', '#9B7AE8', '#16141E'],
    colors: palette({
      text: '#F4F0FF',
      textSecondary: '#A098B8',
      background: '#16141E',
      backgroundAlt: '#1C1A26',
      surface: '#262232',
      surfaceSolid: '#201C2A',
      border: '#322C40',
      tint: '#C4A8FF',
      tintSoft: '#E0D4FF',
      night: '#9B7AE8',
      nightSoft: '#C4B0F0',
      tabIconDefault: '#6E6680',
      tabIconSelected: '#C4A8FF',
      danger: '#E88A9A',
      success: '#8ABB9A',
      scheduleAccent: '#C4A8FF',
      anytimeAccent: '#9B7AE8',
      muted: '#2A2538',
      hairline: 'rgba(244,240,255,0.09)',
      overlay: 'rgba(22,20,30,0.55)',
      bubble: '#262232',
      timelineCard: '#201C2A',
      checkRing: '#C4A8FF',
      checkRingNight: '#9B7AE8',
      spine: '#C4A8FF',
      spineFade: '#9B7AE8',
      accentApricot: '#E0D4FF',
      fabGradient: ['#C4A8FF', '#9B7AE8'],
      chipColors: ['#C4A8FF', '#9B7AE8', '#E0D4FF', '#B090F0', '#8A70D0', '#D4C0FF'],
      onTint: '#16141E',
    }),
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow',
    blurb: 'Every hue · maximum spice',
    swatches: ['#FF6B9A', '#5CE1E6', '#FFE66D'],
    colors: palette({
      text: '#FFF8FF',
      textSecondary: '#B0A8C0',
      background: '#15121C',
      backgroundAlt: '#1C1826',
      surface: '#282234',
      surfaceSolid: '#201A2C',
      border: '#342C48',
      tint: '#FF6B9A',
      tintSoft: '#FF9EBC',
      night: '#5CE1E6',
      nightSoft: '#9AEEF0',
      tabIconDefault: '#706888',
      tabIconSelected: '#FF6B9A',
      danger: '#FF5A6A',
      success: '#7DFF9A',
      scheduleAccent: '#FF6B9A',
      anytimeAccent: '#5CE1E6',
      muted: '#2A2438',
      hairline: 'rgba(255,248,255,0.1)',
      overlay: 'rgba(21,18,28,0.55)',
      bubble: '#282234',
      timelineCard: '#201A2C',
      checkRing: '#FF6B9A',
      checkRingNight: '#5CE1E6',
      spine: '#FF6B9A',
      spineFade: '#5CE1E6',
      accentApricot: '#FFE66D',
      fabGradient: ['#FF6B9A', '#5CE1E6'],
      chipColors: ['#FF6B9A', '#FFE66D', '#5CE1E6', '#C4A8FF', '#7DFF9A', '#FF9F6B'],
      onTint: '#15121C',
    }),
  },
};

export const THEME_LIST: AppTheme[] = [
  THEMES.minimal,
  THEMES.coral,
  THEMES.volt,
  THEMES.ocean,
  THEMES.sunset,
  THEMES.lilac,
  THEMES.rainbow,
];

export const DEFAULT_THEME_ID: ThemeId = 'minimal';

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && value in THEMES;
}
