import { WsException } from '@nestjs/websockets';
import { ChatGateway } from './chat.gateway';
import { UserRole } from '../users/user.constant';

describe('ChatGateway security boundaries', () => {
  const makeGateway = (authService: any = {}) =>
    new ChatGateway({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, authService);

  it('disconnects a socket that does not provide a token', async () => {
    const gateway = makeGateway({ validateToken: jest.fn() });
    const client: any = {
      handshake: { auth: {}, headers: {} },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      once: jest.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('auth_error', { message: 'Authentication required' });
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('joins only the verified user room', async () => {
    const payload: any = {
      id: '507f1f77bcf86cd799439011',
      email: 'member@example.com',
      role: UserRole.DOCTOR,
      type: 'access',
      tokenVersion: 0,
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    const gateway = makeGateway({ validateToken: jest.fn().mockResolvedValue(payload) });
    const client: any = {
      handshake: { auth: { token: 'signed-token' }, headers: {} },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      once: jest.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.data.user).toEqual(payload);
    expect(client.join).toHaveBeenCalledWith(`user:${payload.id}`);
    expect(client.disconnect).not.toHaveBeenCalled();
    clearTimeout(client.data.expirationTimer);
  });

  it('derives the sender from the authenticated socket instead of client input', async () => {
    const socketUser: any = { id: 'verified-user', role: UserRole.DOCTOR };
    const gateway = makeGateway({ validateToken: jest.fn().mockResolvedValue(socketUser) });
    const sendMessage = jest.spyOn(gateway, 'sendMessage').mockResolvedValue({} as any);
    const client: any = {
      data: { user: socketUser, accessToken: 'signed-token' },
    };

    await gateway.handleMessage(client, {
      receiver: '507f1f77bcf86cd799439011',
      content: 'Hello',
      clientMessageId: '59d7e9f8-343e-4f59-8b34-26d486fef94f',
      sender: 'spoofed-user',
    } as any);

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ sender: 'verified-user', receiver: '507f1f77bcf86cd799439011' }),
    );
  });

  it('rejects member attempts to use the admin broadcast channel', async () => {
    const socketUser: any = { id: 'member', role: UserRole.DOCTOR };
    const gateway = makeGateway({ validateToken: jest.fn().mockResolvedValue(socketUser) });
    const client: any = {
      data: { user: socketUser, accessToken: 'signed-token' },
    };

    await expect(
      gateway.handleBroadcast(client, { receiverCriteria: {}, content: 'Unauthorized' }),
    ).rejects.toBeInstanceOf(WsException);
  });

  it('emits private chat events only to the two participant rooms', () => {
    const gateway = makeGateway();
    const emit = jest.fn();
    const secondRoom = { emit };
    const firstRoom = { to: jest.fn().mockReturnValue(secondRoom), emit };
    (gateway as any).server = { to: jest.fn().mockReturnValue(firstRoom), emit: jest.fn() };

    (gateway as any).emitToConversation('member-a', 'member-b', { _id: 'message' });

    expect((gateway as any).server.to).toHaveBeenCalledWith('user:member-a');
    expect(firstRoom.to).toHaveBeenCalledWith('user:member-b');
    expect(emit).toHaveBeenCalledWith('newMessage_member-a_member-b', { _id: 'message' });
    expect((gateway as any).server.emit).not.toHaveBeenCalled();
  });
});
