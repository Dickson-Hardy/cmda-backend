import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

describe('PaginationQueryDto', () => {
  it('accepts the legacy React Native cache-buster', async () => {
    const query = plainToInstance(PaginationQueryDto, {
      page: '1',
      limit: '20',
      _: '1785613752608',
    }, { enableImplicitConversion: true });

    await expect(validate(query, { whitelist: true, forbidNonWhitelisted: true }))
      .resolves.toHaveLength(0);
  });
});
