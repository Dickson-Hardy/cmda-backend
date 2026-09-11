import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('accepts the bio and leadership position submitted by the web profile form', async () => {
    const payload = {
      firstName: 'Ada',
      bio: 'Christian doctor and mentor',
      leadershipPosition: 'Chapter President',
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: UpdateUserDto,
      }),
    ).resolves.toMatchObject(payload);
  });

  it('still rejects unsupported profile fields', async () => {
    await expect(
      validationPipe.transform({ unsupported: true }, { type: 'body', metatype: UpdateUserDto }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
