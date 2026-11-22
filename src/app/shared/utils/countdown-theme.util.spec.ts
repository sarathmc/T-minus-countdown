import { COUNTDOWN_THEME_PRESETS } from '../../domain/models/countdown-theme.model';
import { themeStyle } from './countdown-theme.util';

function luminance(hex: string): number {
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset + 1, offset + 3), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('countdown theme tokens', () => {
  it('provides readable text, links, progress, and button tokens for every preset', () => {
    for (const theme of COUNTDOWN_THEME_PRESETS) {
      const tokens = themeStyle(theme);
      expect(contrast(theme.text, theme.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.secondaryText, theme.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.accent, theme.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.accent, tokens['--countdown-button-foreground'])).toBeGreaterThanOrEqual(4.5);
      expect(tokens['--countdown-link']).toBe(theme.text);
      expect(tokens['--countdown-progress-fill']).toBe(theme.accent);
    }
  });
});
