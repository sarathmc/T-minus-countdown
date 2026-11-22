import { wallpaperDimensions } from './wallpaper-studio.model';

describe('wallpaperDimensions', () => {
  it('returns exact 9:16 mobile and 16:9 desktop export dimensions', () => {
    expect(wallpaperDimensions('mobile')).toEqual({ width: 1080, height: 1920 });
    expect(wallpaperDimensions('mobile').width / wallpaperDimensions('mobile').height).toBeCloseTo(9 / 16);
    expect(wallpaperDimensions('desktop')).toEqual({ width: 1920, height: 1080 });
    expect(wallpaperDimensions('desktop').width / wallpaperDimensions('desktop').height).toBeCloseTo(16 / 9);
  });
});