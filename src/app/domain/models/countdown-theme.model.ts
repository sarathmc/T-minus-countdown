export type CountdownThemeId = 'gradient' | 'minimal-light' | 'minimal-dark' | 'bold' | 'milestone';
export type CountdownThemeBorder = 'none' | 'subtle' | 'strong';
export type CountdownThemeLayout = 'left' | 'center' | 'right';

export interface CountdownTheme {
  id: CountdownThemeId;
  name: string;
  background: string;
  surface: string;
  text: string;
  secondaryText: string;
  accent: string;
  digitFont: string;
  labelFont: string;
  border: CountdownThemeBorder;
  radius: 'sm' | 'md' | 'lg';
  layout: CountdownThemeLayout;
}

export const COUNTDOWN_THEME_PRESETS: readonly CountdownTheme[] = [
  {
    id: 'gradient',
    name: 'Gradient Focus',
    background: '#293d75',
    surface: '#324982',
    text: '#ffffff',
    secondaryText: '#dbe7ff',
    accent: '#a9dbd2',
    digitFont: 'Arial, sans-serif',
    labelFont: 'Arial, sans-serif',
    border: 'subtle',
    radius: 'lg',
    layout: 'center',
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    background: '#f4f0e8',
    surface: '#fffdf8',
    text: '#24231f',
    secondaryText: '#655f56',
    accent: '#8e542f',
    digitFont: 'Georgia, serif',
    labelFont: 'Georgia, serif',
    border: 'subtle',
    radius: 'lg',
    layout: 'center',
  },
  {
    id: 'minimal-dark',
    name: 'Midnight Dark',
    background: '#151923',
    surface: '#202532',
    text: '#f4f2ec',
    secondaryText: '#b7bfce',
    accent: '#c4a878',
    digitFont: 'Arial, sans-serif',
    labelFont: 'Arial, sans-serif',
    border: 'subtle',
    radius: 'lg',
    layout: 'center',
  },
  {
    id: 'bold',
    name: 'Bold Typography',
    background: '#f5cb4b',
    surface: '#ffda62',
    text: '#171717',
    secondaryText: '#4d3c13',
    accent: '#a7271e',
    digitFont: 'Arial Black, Arial, sans-serif',
    labelFont: 'Arial, sans-serif',
    border: 'strong',
    radius: 'md',
    layout: 'left',
  },
  {
    id: 'milestone',
    name: 'Milestone Planner',
    background: '#e7eee8',
    surface: '#f8fbf8',
    text: '#203b32',
    secondaryText: '#5b776a',
    accent: '#39735d',
    digitFont: 'Georgia, serif',
    labelFont: 'Georgia, serif',
    border: 'subtle',
    radius: 'md',
    layout: 'left',
  },
];

export const DEFAULT_COUNTDOWN_THEME = COUNTDOWN_THEME_PRESETS[1];

export function countdownThemeById(id: string | undefined): CountdownTheme {
  return COUNTDOWN_THEME_PRESETS.find((theme) => theme.id === id) ?? DEFAULT_COUNTDOWN_THEME;
}

export function isCountdownTheme(value: unknown): value is CountdownTheme {
  if (!value || typeof value !== 'object') return false;
  const theme = value as Partial<CountdownTheme>;
  return COUNTDOWN_THEME_PRESETS.some((preset) => preset.id === theme.id) &&
    typeof theme.name === 'string' &&
    typeof theme.background === 'string' &&
    typeof theme.surface === 'string' &&
    typeof theme.text === 'string' &&
    typeof theme.secondaryText === 'string' &&
    typeof theme.accent === 'string' &&
    typeof theme.digitFont === 'string' &&
    typeof theme.labelFont === 'string' &&
    ['none', 'subtle', 'strong'].includes(theme.border ?? '') &&
    ['sm', 'md', 'lg'].includes(theme.radius ?? '') &&
    ['left', 'center', 'right'].includes(theme.layout ?? '');
}
