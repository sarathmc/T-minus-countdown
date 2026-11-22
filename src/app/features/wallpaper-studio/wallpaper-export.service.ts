import { Injectable } from '@angular/core';
import { Countdown } from '../../domain/models/countdown.model';
import { CountdownCalculatorService } from '../../core/services/countdown-calculator.service';
import { wallpaperDimensions, WallpaperOptions, WALLPAPER_TEMPLATES } from './wallpaper-studio.model';

@Injectable({ providedIn: 'root' })
export class WallpaperExportService {
  constructor(private readonly calculator: CountdownCalculatorService) {}

  async createPng(countdown: Countdown, options: WallpaperOptions): Promise<Blob> {
    const { width, height } = wallpaperDimensions(options.format);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG rendering is unavailable in this browser.');
    const template = WALLPAPER_TEMPLATES.find((item) => item.id === options.template)!;
    this.paintBackground(context, width, height, options, template.id);
    const center = options.alignment === 'left' ? width * 0.12 : options.alignment === 'right' ? width * 0.88 : width / 2;
    context.textBaseline = 'middle';
    context.fillStyle = options.foreground;
    const size = width * (options.fontSize / 100);
    const font = options.font;
    const contentWidth = width * 0.76;
    const safeTop = height * (options.format === 'mobile' ? 0.16 : 0.14);
    const titleBaseSize = size * (template.id === 'bold' ? 1.15 : 0.75);
    const title = options.showTitle
      ? this.fitTitle(context, countdown.title, center, contentWidth, safeTop, titleBaseSize, font, options.alignment)
      : undefined;
    let y = title ? title.bottom + size * 0.55 : safeTop + size * 0.65;
    if (options.showTimer) {
      const time = this.calculator.getTimeParts(countdown.targetDate);
      y = this.drawTimer(context, [String(time.days), String(time.hours).padStart(2, '0'), String(time.minutes).padStart(2, '0'), String(time.seconds).padStart(2, '0')],
        center, contentWidth, y, size, font, options);
    }
    if (options.showDate) {
      context.font = `400 ${Math.round(size * 0.27)}px ${font}`;
      context.textAlign = options.alignment;
      context.fillText(this.calculator.formatInTimeZone(countdown.targetDate, countdown.timeZone), center, y, width * 0.8);
      y += size * 0.62;
    }
    if (options.showMilestones && template.id === 'milestone') {
      const milestones = [...countdown.milestones].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
      context.textAlign = 'left';
      const x = width * 0.16;
      y = Math.max(y, height * 0.58);
      context.font = `500 ${Math.round(size * 0.25)}px ${font}`;
      const line = size * 0.42;
      milestones.forEach((milestone, index) => {
        context.fillStyle = milestone.done ? options.accent : options.foreground;
        context.fillText(`${milestone.done ? '✓' : '○'}  ${milestone.title}`, x, y + index * line, width * 0.68);
      });
    }
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode the wallpaper as PNG.')), 'image/png'));
  }

  private paintBackground(context: CanvasRenderingContext2D, width: number, height: number, options: WallpaperOptions, template: string): void {
    if (template === 'gradient') {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, options.background);
      gradient.addColorStop(1, options.accent);
      context.fillStyle = gradient;
    } else context.fillStyle = options.background;
    context.fillRect(0, 0, width, height);
    if (template === 'gradient') {
      const glow = context.createRadialGradient(width * 0.75, height * 0.2, 0, width * 0.75, height * 0.2, width * 0.8);
      glow.addColorStop(0, 'rgba(255,255,255,.2)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    }
  }

  private fitTitle(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    maxWidth: number,
    top: number,
    baseSize: number,
    font: string,
    alignment: WallpaperOptions['alignment']
  ): { bottom: number } | undefined {
    if (!text) return undefined;
    let fontSize = baseSize;
    let lines: string[] = [];
    for (let attempt = 0; attempt < 16; attempt += 1) {
      context.font = `600 ${Math.round(fontSize)}px ${font}`;
      lines = this.wrapText(context, text, maxWidth);
      if (lines.length <= 2) break;
      fontSize *= 0.9;
    }
    const lineHeight = fontSize * 1.08;
    context.textAlign = alignment;
    lines.forEach((line, index) => context.fillText(line, x, top + fontSize * 0.55 + index * lineHeight, maxWidth));
    return { bottom: top + fontSize * 0.55 + (lines.length - 1) * lineHeight + fontSize * 0.55 };
  }

  private wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let current = '';
    for (const word of text.trim().split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (current && context.measureText(next).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }

  private drawTimer(
    context: CanvasRenderingContext2D,
    values: string[],
    center: number,
    width: number,
    y: number,
    size: number,
    font: string,
    options: WallpaperOptions
  ): number {
    const columnWidth = width / 4;
    const digitSize = Math.min(size, columnWidth * 0.62);
    context.textAlign = 'center';
    context.fillStyle = options.accent;
    context.font = `700 ${Math.round(digitSize)}px ${font}`;
    values.forEach((value, index) => context.fillText(value, center - width / 2 + columnWidth * (index + 0.5), y, columnWidth));
    context.globalAlpha = 0.72;
    context.fillStyle = options.foreground;
    context.font = `500 ${Math.round(digitSize * 0.2)}px ${font}`;
    ['DAYS', 'HOURS', 'MINUTES', 'SECONDS'].forEach((label, index) =>
      context.fillText(label, center - width / 2 + columnWidth * (index + 0.5), y + digitSize * 0.72, columnWidth));
    context.globalAlpha = 1;
    return y + digitSize * 1.28;
  }
}