import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateChapterDto } from './create-chapter.dto';
import { ChapterType } from '../chapters.schema';

describe('CreateChapterDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('accepts the active status submitted by the admin chapter form', async () => {
    const payload = {
      name: 'Test Chapter',
      type: ChapterType.STUDENT,
      description: '',
      location: '',
      isActive: true,
    };

    await expect(
      validationPipe.transform(payload, {
        type: 'body',
        metatype: CreateChapterDto,
      }),
    ).resolves.toMatchObject(payload);
  });

  it('still rejects unsupported fields', async () => {
    await expect(
      validationPipe.transform(
        {
          name: 'Test Chapter',
          type: ChapterType.STUDENT,
          unsupported: true,
        },
        {
          type: 'body',
          metatype: CreateChapterDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
