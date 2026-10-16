import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserRole } from '../users/user.constant';

const queryResult = (value: any) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

describe('AuthService token lifecycle', () => {
  const secret = 'unit-test-secret-that-is-long-enough';
  let jwtService: JwtService;
  let userModel: any;
  let service: AuthService;

  beforeEach(() => {
    jwtService = new JwtService({ secret });
    userModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    const adminModel: any = {
      findById: jest.fn(),
      updateOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET' || key === 'JWT_REFRESH_SECRET') return secret;
        if (key === 'JWT_EXPIRE') return '15m';
        if (key === 'JWT_REFRESH_EXPIRE') return '30d';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new AuthService(userModel, adminModel, jwtService, config, {} as any, {} as any);
  });

  it('does not accept a refresh token as an access token', async () => {
    const token = jwtService.sign({
      id: '507f1f77bcf86cd799439011',
      email: 'member@example.com',
      role: UserRole.DOCTOR,
      type: 'refresh',
      tokenVersion: 0,
      sessionId: 'session',
    });

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('rejects an access token after its token version is revoked', async () => {
    const token = jwtService.sign({
      id: '507f1f77bcf86cd799439011',
      email: 'member@example.com',
      role: UserRole.DOCTOR,
      type: 'access',
      tokenVersion: 1,
    });
    userModel.findById.mockReturnValue(queryResult({ tokenVersion: 2, isActive: true }));

    await expect(service.validateToken(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates a refresh token atomically and rejects replay', async () => {
    const sessionId = '6fd092fb-6e2a-4211-a735-d2e8dc5e1d0d';
    const refreshToken = jwtService.sign(
      {
        id: '507f1f77bcf86cd799439011',
        email: 'member@example.com',
        role: UserRole.DOCTOR,
        type: 'refresh',
        tokenVersion: 0,
        sessionId,
      },
      { expiresIn: '30d' },
    );
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const account = {
      email: 'member@example.com',
      role: UserRole.DOCTOR,
      tokenVersion: 0,
      isActive: true,
      isBanned: false,
      refreshSessions: [{ sessionId, tokenHash, expiresAt: new Date(Date.now() + 60_000) }],
    };
    userModel.findById.mockReturnValue(queryResult(account));
    userModel.updateOne
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 0 });

    const first = await service.refreshToken(refreshToken);
    expect((first.data as any).accessToken).toBeTruthy();
    expect((first.data as any).refreshToken).toBeTruthy();
    expect((first.data as any).refreshToken).not.toBe(refreshToken);

    await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a valid password when the member account is unavailable', async () => {
    userModel.findOne.mockResolvedValue({
      password: await bcrypt.hash('Password123!', 4),
      isActive: false,
      isBanned: false,
    });

    await expect(
      service.login({ email: 'member@example.com', password: 'Password123!' }),
    ).rejects.toThrow('This account is not currently available');
  });

  it('replaces the revoked browser session after a password change', async () => {
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const member = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      email: 'member@example.com',
      role: UserRole.DOCTOR,
      password: await bcrypt.hash('OldPassword123!', 4),
      createdByAdmin: false,
      updateOne,
    };
    const updatedMember = { ...member, requirePasswordChange: false };
    userModel.findById.mockResolvedValueOnce(member).mockResolvedValueOnce(updatedMember);
    jest.spyOn(service, 'issueTokenPair').mockResolvedValue({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
      refreshToken: 'new-refresh-token',
      refreshTokenExpiresAt: new Date('2030-02-01T00:00:00.000Z'),
    });

    const response = await service.changePassword('507f1f77bcf86cd799439011', {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    });

    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $set: expect.objectContaining({ refreshSessions: [], requirePasswordChange: false }),
        $inc: { tokenVersion: 1 },
      }),
    );
    expect(response.data).toEqual(
      expect.objectContaining({
        user: updatedMember,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    );
  });

  it('binds a password reset token to the submitted email address', async () => {
    userModel.findOne.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        email: 'member@example.com',
        token: '123456',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    ).rejects.toThrow('Password reset token is invalid or expired');

    expect(userModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordResetToken: '123456',
        email: expect.objectContaining({ $options: 'i' }),
      }),
    );
  });
});
