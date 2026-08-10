import { Test } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsGateway', () => {
  it('resolves its notification service dependency', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: NotificationsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    expect(moduleRef.get(NotificationsGateway)).toBeInstanceOf(NotificationsGateway);
  });
});
