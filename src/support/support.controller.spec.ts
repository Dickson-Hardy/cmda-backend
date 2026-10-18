import { Test } from '@nestjs/testing';
import { Reflector, APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthService } from '../auth/auth.service';

describe('Support HTTP permissions and contracts', () => {
  let app: INestApplication;
  const service = {
    list: jest.fn().mockResolvedValue({ items: [], meta: { totalItems: 0 } }),
    track: jest.fn().mockResolvedValue({ reference: 'CMDA-TEST' }),
    create: jest.fn(),
    update: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [
        { provide: SupportService, useValue: service },
        Reflector,
        {
          provide: AuthService,
          useValue: {
            validateToken: async (token) => ({ id: '507f1f77bcf86cd799439011', role: token }),
          },
        },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });
  afterAll(() => app.close());
  it('blocks unauthenticated access to the shared inbox', () =>
    request(app.getHttpServer()).get('/support/admin/tickets').expect(401));
  it('blocks members from the admin inbox', () =>
    request(app.getHttpServer())
      .get('/support/admin/tickets')
      .set('Authorization', 'Bearer Student')
      .expect(403));
  it.each(['SuperAdmin', 'FinanceManager', 'MemberManager'])('allows the %s admin role', (role) =>
    request(app.getHttpServer())
      .get('/support/admin/tickets')
      .set('Authorization', `Bearer ${role}`)
      .expect(200),
  );
  it('allows private tracking without a CMDA login', async () => {
    await request(app.getHttpServer())
      .get('/support/tickets/CMDA-TEST')
      .set('X-Support-Token', 'a'.repeat(64))
      .expect(200);
    expect(service.track).toHaveBeenCalledWith('CMDA-TEST', 'a'.repeat(64));
  });
  it('rejects unknown fields and invalid public submissions', () =>
    request(app.getHttpServer())
      .post('/support/tickets')
      .send({ role: 'SuperAdmin', email: 'bad' })
      .expect(400));
  it('validates admin pagination rather than accepting unbounded queries', () =>
    request(app.getHttpServer())
      .get('/support/admin/tickets?limit=10000')
      .set('Authorization', 'Bearer SuperAdmin')
      .expect(400));
});
