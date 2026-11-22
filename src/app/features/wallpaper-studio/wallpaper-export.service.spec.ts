import { TestBed } from '@angular/core/testing';
import { CountdownFactoryService } from '../../core/services/countdown-factory.service';
import { WallpaperExportService } from './wallpaper-export.service';
import { WallpaperOptions } from './wallpaper-studio.model';

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
});