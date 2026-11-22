export type WallpaperTemplateId = 'minimal-light' | 'minimal-dark' | 'bold' | 'gradient' | 'milestone';
export type WallpaperFormat = 'mobile' | 'desktop';
export type WallpaperAlignment = 'left' | 'center' | 'right';

export interface WallpaperTemplate {
  id: WallpaperTemplateId;
  name: string;
  description: string;
  background: string;
  foreground: string;
  accent: string;
  font: string;
}

export interface WallpaperOptions {
  format: WallpaperFormat;
  template: WallpaperTemplateId;
  background: string;
  foreground: string;
  accent: string;
  font: string;
  fontSize: number;
  alignment: WallpaperAlignment;
  showTitle: boolean;
  showTimer: boolean;
  showDate: boolean;
  showMilestones: boolean;
}

export const WALLPAPER_TEMPLATES: readonly WallpaperTemplate[] = [
  { id: 'minimal-light', name: 'Minimal light', description: 'Quiet, editorial and bright.', background: '#f4f0e8', foreground: '#24231f', accent: '#a46b43', font: 'Georgia, serif' },
  { id: 'minimal-dark', name: 'Minimal dark', description: 'A calm midnight canvas.', background: '#151923', foreground: '#f4f2ec', accent: '#c4a878', font: 'Arial, sans-serif' },
  { id: 'bold', name: 'Bold typography', description: 'High contrast, made to stand out.', background: '#f5cb4b', foreground: '#171717', accent: '#b83226', font: 'Arial Black, Arial, sans-serif' },
  { id: 'gradient', name: 'Gradient focus', description: 'Deep blue with a luminous focal glow.', background: '#293d75', foreground: '#ffffff', accent: '#a9dbd2', font: 'Arial, sans-serif' },
  { id: 'milestone', name: 'Milestone planner', description: 'Keep the next checkpoints in view.', background: '#e7eee8', foreground: '#203b32', accent: '#39735d', font: 'Georgia, serif' },
];

export function wallpaperDimensions(format: WallpaperFormat): { width: number; height: number } {
  return format === 'mobile' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
}