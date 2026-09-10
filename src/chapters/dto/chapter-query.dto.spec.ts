import { ValidationPipe } from '@nestjs/common';
import { ChapterType } from '../chapters.schema';
import { ChapterQueryDto } from './chapter-query.dto';

describe('ChapterQueryDto', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('transforms pagination query parameters to numbers', async () => {
    await expect(
      validationPipe.transform(
        { type: ChapterType.DOCTOR, page: '2', limit: '25' },
        { type: 'query', metatype: ChapterQueryDto },
      ),
    ).resolves.toMatchObject({ type: ChapterType.DOCTOR, page: 2, limit: 25 });
  });

  it('keeps GlobalNetwork clients compatible with Global chapters', async () => {
    await expect(
      validationPipe.transform(
        { type: 'GlobalNetwork' },
        { type: 'query', metatype: ChapterQueryDto },
      ),
    ).resolves.toMatchObject({ type: ChapterType.GLOBAL });
  });
});
