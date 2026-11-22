import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Request } from 'express';

type AuthenticatedRequest = Request & { userId?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Bearer access token required.');
    const url = this.config.get<string>('SUPABASE_URL');
    if (!url) throw new ServiceUnavailableException('Authentication is not configured.');
    try {
      this.jwks ??= createRemoteJWKSet(new URL(`${url.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`));
      const { payload } = await jwtVerify(token, this.jwks, { issuer: `${url.replace(/\/$/, '')}/auth/v1`, audience: 'authenticated' });
      if (typeof payload['sub'] !== 'string' || !payload['sub']) throw new UnauthorizedException('Invalid token subject.');
      request.userId = payload['sub'];
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error;
      throw new UnauthorizedException('Access token is invalid or expired.');
    }
  }
}