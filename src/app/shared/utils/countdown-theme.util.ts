import { Countdown } from '../../domain/models/countdown.model';
import { CountdownTheme, DEFAULT_COUNTDOWN_THEME } from '../../domain/models/countdown-theme.model';
import { normalizeCountdownTheme } from '../../core/services/countdown-repository';

export function themeForCountdown(countdown: Countdown): CountdownTheme {
  return normalizeCountdownTheme(countdown.theme);
}

export function themeStyle(theme: CountdownTheme): Record<string, string> {
  const border = theme.border === 'none'
    ? 'none'
    : `1px solid ${theme.border === 'strong' ? theme.accent : theme.secondaryText}`;
  const radius = theme.radius === 'sm' ? '6px' : theme.radius === 'md' ? '10px' : '16px';
  return {
    '--countdown-background': theme.background,
    '--countdown-surface': theme.surface,
    '--countdown-text': theme.text,
    '--countdown-secondary-text': theme.secondaryText,
    '--countdown-accent': theme.accent,
    '--countdown-digit-font': theme.digitFont,
    '--countdown-label-font': theme.labelFont,
    '--countdown-border': border,
    '--countdown-radius': radius,
    '--countdown-layout': theme.layout,
  };
}

export const DEFAULT_THEME_STYLE = themeStyle(DEFAULT_COUNTDOWN_THEME);
