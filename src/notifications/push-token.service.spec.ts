import { PushTokenService } from './push-token.service';

describe('PushTokenService', () => {
  it('includes legacy users without an isActive field in direct targeting', async () => {
    let capturedUserQuery: Record<string, unknown> | undefined;
    const userModel = {
      find: jest.fn((query) => {
        capturedUserQuery = query;
        return {
          select: jest
            .fn()
            .mockResolvedValue([{ _id: { toString: () => '674849f1e0aaf61ef50bd64b' } }]),
        };
      }),
    };
    const pushTokenModel = {
      find: jest.fn().mockResolvedValue([
        {
          userId: '674849f1e0aaf61ef50bd64b',
          token: 'ExponentPushToken[test-token]',
        },
      ]),
    };
    const service = new PushTokenService(pushTokenModel as never, userModel as never);

    const result = await service.getTokensForTarget('user', 'dicksonhardy7@gmail.com');

    expect(capturedUserQuery).toEqual(
      expect.objectContaining({
        isActive: { $ne: false },
        email: 'dicksonhardy7@gmail.com',
      }),
    );
    expect(result).toEqual([
      {
        userId: '674849f1e0aaf61ef50bd64b',
        tokens: ['ExponentPushToken[test-token]'],
      },
    ]);
  });
});
