import { ChatOutboxProcessor } from './chat-outbox.processor';

describe('ChatOutboxProcessor', () => {
  const createProcessor = ({ pushFails = false } = {}) => {
    const event = {
      receiver: '507f1f77bcf86cd799439011',
      message: '507f1f77bcf86cd799439012',
      attempts: 0,
      updateOne: jest.fn().mockResolvedValue(undefined),
    };
    const outboxModel = {
      findOneAndUpdate: jest.fn().mockResolvedValueOnce(event).mockResolvedValueOnce(null),
    };
    const message = {
      _id: { toString: () => '507f1f77bcf86cd799439012' },
      sender: '507f1f77bcf86cd799439013',
      content: 'Hello from chat',
    };
    const messageModel = {
      findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(message) }),
    };
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ fullName: 'Dr Sender' }),
        }),
      }),
    };
    const notificationsGateway = {
      broadcastNewMessageNotification: jest.fn().mockResolvedValue(undefined),
    };
    const adminNotificationService = {
      sendChatMessagePush: pushFails
        ? jest.fn().mockRejectedValue(new Error('Expo unavailable'))
        : jest.fn().mockResolvedValue({ total: 1, delivered: 1, failed: 0 }),
    };
    const processor = new ChatOutboxProcessor(
      outboxModel as any,
      messageModel as any,
      userModel as any,
      notificationsGateway as any,
      adminNotificationService as any,
    );
    return {
      processor,
      event,
      notificationsGateway,
      adminNotificationService,
    };
  };

  it('sends push after the in-app notification and then completes the outbox event', async () => {
    const { processor, event, notificationsGateway, adminNotificationService } = createProcessor();

    await processor.processPendingMessages();

    expect(notificationsGateway.broadcastNewMessageNotification).toHaveBeenCalledTimes(1);
    expect(adminNotificationService.sendChatMessagePush).toHaveBeenCalledWith({
      userId: '507f1f77bcf86cd799439011',
      senderId: '507f1f77bcf86cd799439013',
      senderName: 'Dr Sender',
      messageId: '507f1f77bcf86cd799439012',
      content: 'Hello from chat',
    });
    expect(
      notificationsGateway.broadcastNewMessageNotification.mock.invocationCallOrder[0],
    ).toBeLessThan(adminNotificationService.sendChatMessagePush.mock.invocationCallOrder[0]);
    expect(event.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ $set: expect.objectContaining({ status: 'processed' }) }),
    );
  });

  it('returns the outbox event to retry when push delivery throws', async () => {
    const { processor, event } = createProcessor({ pushFails: true });

    await processor.processPendingMessages();

    expect(event.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'pending', attempts: 1 }),
      }),
    );
  });
});
