import { TestBed } from '@angular/core/testing';
import { CountdownFactoryService } from '../../core/services/countdown-factory.service';
import { WallpaperExportService } from './wallpaper-export.service';
import { WallpaperOptions, WALLPAPER_TEMPLATES } from './wallpaper-studio.model';

describe('WallpaperExportService', () => {
  it('renders a downloadable high-resolution PNG blob', async () => {
    const canvasExport = spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callThrough();
    const countdown = TestBed.inject(CountdownFactoryService).create({
      title: 'Export test', targetDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      timeZone: 'UTC', category: 'work',
    });
    const options: WallpaperOptions = {
      format: 'mobile', template: 'minimal-light', background: '#f4f0e8', foreground: '#24231f',
      accent: '#a46b43', font: 'Georgia, serif', fontSize: 8, alignment: 'center',
      showTitle: true, showTimer: true, showDate: true, showMilestones: true,
    };
    const blob = await TestBed.inject(WallpaperExportService).createPng(countdown, options);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(1000);
    const canvas = canvasExport.calls.mostRecent().object as HTMLCanvasElement;
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it('keeps long and short titles within both export compositions for every template', async () => {
    const canvasExport = spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callThrough();
    const factory = TestBed.inject(CountdownFactoryService);
    const exporter = TestBed.inject(WallpaperExportService);
    const countdowns = [
      factory.create({
        title: 'A very long countdown title that should remain readable and complete',
        targetDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        timeZone: 'UTC', category: 'work',
      }),
      factory.create({
        title: 'Launch',
        targetDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        timeZone: 'UTC', category: 'work',
      }),
    ];
    const base: WallpaperOptions = {
      format: 'mobile', template: 'minimal-light', background: '#f4f0e8', foreground: '#24231f',
      accent: '#a46b43', font: 'Georgia, serif', fontSize: 8, alignment: 'center',
      showTitle: true, showTimer: true, showDate: true, showMilestones: true,
    };

    for (const countdown of countdowns) {
      for (const template of WALLPAPER_TEMPLATES) {
        for (const format of ['mobile', 'desktop'] as const) {
          const blob = await exporter.createPng(countdown, { ...base, ...template, template: template.id, format });
        expect(blob.type).toBe('image/png');
        expect(blob.size).toBeGreaterThan(1000);
        const canvas = canvasExport.calls.mostRecent().object as HTMLCanvasElement;
        expect({ width: canvas.width, height: canvas.height }).toEqual(
          format === 'mobile' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }
        );
        }
      }
    }
  });
});