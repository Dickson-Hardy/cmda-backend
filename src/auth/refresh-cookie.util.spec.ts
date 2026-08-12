import { UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { resolveRefreshToken, setRefreshCookie } from './refresh-cookie.util';

describe('refresh cookie boundary', () => {
  it('keeps member and admin browser sessions in separate HttpOnly cookies', () => {
    const cookie = jest.fn();
    const response = { cookie } as unknown as Response;
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');

    setRefreshCookie(response, 'member.jwt.token', expiresAt, 'member');
    setRefreshCookie(response, 'admin.jwt.token', expiresAt, 'admin');

    expect(cookie).toHaveBeenNthCalledWith(
      1,
      'cmda_member_refresh',
      'member.jwt.token',
      expect.objectContaining({ httpOnly: true, path: '/auth/refresh-token' }),
    );
    expect(cookie).toHaveBeenNthCalledWith(
      2,
      'cmda_admin_refresh',
      'admin.jwt.token',
      expect.objectContaining({ httpOnly: true, path: '/auth/refresh-token' }),
    );
  });

  it('accepts an allowed-origin cookie and rejects a cross-site cookie refresh', () => {
    const allowedRequest = {
      headers: {
        origin: 'https://cmdanigeria.net',
        cookie: 'cmda_member_refresh=member.jwt.token',
      },
    } as Request;
    expect(resolveRefreshToken(allowedRequest, undefined, 'member')).toBe('member.jwt.token');

    const hostileRequest = {
      headers: {
        origin: 'https://attacker.example',
        cookie: 'cmda_member_refresh=member.jwt.token',
      },
    } as Request;
    expect(() => resolveRefreshToken(hostileRequest, undefined, 'member')).toThrow(
      UnauthorizedException,
    );
  });

  it('preserves token-body refresh for the mobile client', () => {
    const request = { headers: {} } as Request;
    expect(resolveRefreshToken(request, 'mobile.jwt.token')).toBe('mobile.jwt.token');
  });
});
