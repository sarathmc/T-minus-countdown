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
    context.textAlign = options.alignment;
    context.textBaseline = 'middle';
    context.fillStyle = options.foreground;
    const size = width * (options.fontSize / 100);
    const font = options.font;
    let y = height * (options.format === 'mobile' ? 0.31 : 0.27);
    const line = height * (options.format === 'mobile' ? 0.095 : 0.15);
    if (options.showTitle) {
      context.font = `600 ${Math.round(size * (template.id === 'bold' ? 1.15 : 0.75))}px ${font}`;
      this.drawWrapped(context, countdown.title, center, y, width * 0.76, line * 1.25);
      y += line * (countdown.title.length > 22 ? 1.9 : 1.2);
    }
    if (options.showTimer) {
      const time = this.calculator.getTimeParts(countdown.targetDate);
      const digits = `${time.days} : ${String(time.hours).padStart(2, '0')} : ${String(time.minutes).padStart(2, '0')} : ${String(time.seconds).padStart(2, '0')}`;
      context.fillStyle = options.accent;
      context.font = `700 ${Math.round(size)}px ${font}`;
      context.fillText(digits, center, y, width * 0.85);
      y += line * 0.7;
      context.fillStyle = options.foreground;
      context.globalAlpha = 0.72;
      context.font = `500 ${Math.round(size * 0.2)}px ${font}`;
      context.fillText('DAYS              HOURS           MINUTES         SECONDS', center, y, width * 0.85);
      context.globalAlpha = 1;
      y += line * 1.2;
    }
    if (options.showDate) {
      context.font = `400 ${Math.round(size * 0.27)}px ${font}`;
      context.fillText(this.calculator.formatInTimeZone(countdown.targetDate, countdown.timeZone), center, y, width * 0.8);
      y += line * 0.8;
    }
    if (options.showMilestones && template.id === 'milestone') {
      const milestones = [...countdown.milestones].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
      context.textAlign = 'left';
      const x = width * 0.16;
      y = Math.max(y, height * 0.64);
      context.font = `500 ${Math.round(size * 0.25)}px ${font}`;
      milestones.forEach((milestone, index) => {
        context.fillStyle = milestone.done ? options.accent : options.foreground;
        context.fillText(`${milestone.done ? '✓' : '○'}  ${milestone.title}`, x, y + index * line * 0.36, width * 0.68);
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

  private drawWrapped(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (current && context.measureText(next).width > maxWidth) { lines.push(current); current = word; }
      else current = next;
    }
    if (current) lines.push(current);
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight, maxWidth));
  }
}