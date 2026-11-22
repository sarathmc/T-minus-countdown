import { Countdown } from '../../domain/models/countdown.model';
import { CountdownTheme, DEFAULT_COUNTDOWN_THEME } from '../../domain/models/countdown-theme.model';
import { normalizeCountdownTheme } from '../../core/services/countdown-repository';

function contrastForeground(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#ffffff';
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const darkLuminance = 0.2126 * 0.0056 + 0.7152 * 0.0144 + 0.0722 * 0.0152;
  const lightContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
  return lightContrast >= darkContrast ? '#ffffff' : '#172033';
}

export function themeForCountdown(countdown: Countdown): CountdownTheme {
  return normalizeCountdownTheme(countdown.theme);
}

export function themeStyle(theme: CountdownTheme): Record<string, string> {
  const border = theme.border === 'none'
    ? 'none'
    : `1px solid ${theme.border === 'strong' ? theme.accent : theme.secondaryText}`;
  const radius = theme.radius === 'sm' ? '6px' : theme.radius === 'md' ? '10px' : '16px';
  const buttonForeground = contrastForeground(theme.accent);
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
    '--countdown-link': theme.text,
    '--countdown-link-hover': theme.accent,
    '--countdown-focus': theme.accent,
    '--countdown-progress-track': theme.secondaryText,
    '--countdown-progress-fill': theme.accent,
    '--countdown-button-background': theme.accent,
    '--countdown-button-foreground': buttonForeground,
  };
}

export const DEFAULT_THEME_STYLE = themeStyle(DEFAULT_COUNTDOWN_THEME);
