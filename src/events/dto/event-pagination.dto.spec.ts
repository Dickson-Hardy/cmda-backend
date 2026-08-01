import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventPaginationQueryDto } from './event-pagination.dto';

describe('EventPaginationQueryDto', () => {
  it('accepts fromToday as a boolean query string', async () => {
    const query = plainToInstance(EventPaginationQueryDto, {
      page: '1',
      limit: '10',
      fromToday: 'true',
    }, { enableImplicitConversion: true });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query.fromToday).toBe('true');
  });
});
