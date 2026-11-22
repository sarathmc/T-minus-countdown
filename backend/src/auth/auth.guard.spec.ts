import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('rejects missing bearer credentials without trusting a client user id', async () => {
    const config = { get: jest.fn().mockReturnValue('https://example.supabase.co') } as unknown as ConfigService;
    const guard = new AuthGuard(config);
    const request = { headers: {}, userId: 'spoofed' };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.userId).toBe('spoofed');
  });

  it('fails closed when Supabase auth is not configured', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const guard = new AuthGuard(config);
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer token' } }) }) } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow('Authentication is not configured.');
  });
});