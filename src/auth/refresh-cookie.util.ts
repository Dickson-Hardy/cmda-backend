import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ALLOWED_ORIGINS } from '../_global/constants/cors.constants';

type SessionKind = 'member' | 'admin';

const refreshCookieName = (kind: SessionKind) => `cmda_${kind}_refresh`;

export function setRefreshCookie(
  response: Response,
  refreshToken: string,
  refreshTokenExpiresAt: Date | string,
  kind: SessionKind = 'member',
) {
  const production = process.env.NODE_ENV === 'production';
  response.cookie(refreshCookieName(kind), refreshToken, {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/auth/refresh-token',
    expires: new Date(refreshTokenExpiresAt),
  });
}

export function resolveRefreshToken(
  request: Request,
  bodyToken?: string,
  kind: SessionKind = 'member',
): string {
  if (bodyToken) return bodyToken;

  const origin = request.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    throw new UnauthorizedException('Refresh request origin is not allowed');
  }

  const cookies = request.headers.cookie || '';
  const encodedToken = cookies
    .split(';')
    .map((entry) => entry.trim().split('='))
    .find(([name]) => name === refreshCookieName(kind))?.[1];

  if (!encodedToken) {
    throw new UnauthorizedException('Refresh token is required');
  }

  try {
    return decodeURIComponent(encodedToken);
  } catch {
    throw new UnauthorizedException('Refresh token is invalid');
  }
}
