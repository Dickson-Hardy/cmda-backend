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

  it('accepts an ISO date range', async () => {
    const query = plainToInstance(EventPaginationQueryDto, {
      page: '1',
      limit: '10',
      fromDate: '2026-08-02',
      toDate: '2026-08-08',
    }, { enableImplicitConversion: true });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query.fromDate).toBe('2026-08-02');
    expect(query.toDate).toBe('2026-08-08');
  });

  it('rejects a non-ISO range date', async () => {
    const query = plainToInstance(EventPaginationQueryDto, {
      fromDate: '02-08-2026',
      toDate: '2026-08-08',
    }, { enableImplicitConversion: true });

    await expect(validate(query)).resolves.not.toHaveLength(0);
  });
});
