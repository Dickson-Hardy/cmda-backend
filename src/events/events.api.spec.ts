import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as mongoose from 'mongoose';
import * as request from 'supertest';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('Events registration API', () => {
  const userId = '64b7f2c15f91f60012d5a111';

  let app: INestApplication;
  let event: any;
  let eventModel: any;
  let registrationDraftModel: any;
  let paystackService: any;
  let cloudinaryService: any;

  beforeEach(async () => {
    event = {
      _id: new mongoose.Types.ObjectId('64b7f2c15f91f60012d5a222'),
      name: 'Dynamic Conference API Test',
      slug: 'dynamic-conference-api-test',
      linkOrLocation: 'Abuja',
      eventDateTime: new Date('2027-08-20T09:00:00.000Z'),
      isConference: true,
      isPaid: false,
      requiresSubscription: false,
      conferenceConfig: {
        conferenceType: 'National',
        regularRegistrationEndDate: new Date('2027-08-01T23:59:59.000Z'),
        lateRegistrationEndDate: new Date('2027-08-15T23:59:59.000Z'),
      },
      paymentPlans: [{ role: 'Student', registrationPeriod: 'Regular', price: 10000 }],
      accommodationSelectionRequired: true,
      accommodationOptions: [
        {
          id: 'hostel-info',
          name: 'Hostel information only',
          description: 'Contact the hostel directly.',
          isPriced: false,
        },
        {
          id: 'private-room',
          name: 'Private room',
          isPriced: true,
          priceNgn: 25000,
          priceUsd: 20,
        },
      ],
      registrationFields: [
        {
          id: 'arrival',
          label: 'Arrival window',
          type: 'select',
          required: true,
          options: ['Morning', 'Evening'],
        },
        {
          id: 'consent',
          label: 'Photo consent',
          type: 'checkbox',
          required: true,
          options: [],
        },
        {
          id: 'diet',
          label: 'Dietary needs',
          type: 'shortText',
          required: false,
          options: [],
        },
      ],
      registeredUsers: [],
      save: jest.fn().mockImplementation(async () => event),
    };

    const findOneQuery = {
      lean: jest.fn().mockImplementation(async () => event),
      then: (resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(event).then(resolve, reject),
    };

    eventModel = {
      findOne: jest.fn().mockReturnValue(findOneQuery),
      create: jest.fn().mockImplementation(async (payload: any) => ({
        ...payload,
        slug: 'admin-created-dynamic-conference',
      })),
    };
    const userModel = {
      findById: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(userId),
        role: 'Student',
        subscribed: true,
        email: 'student@example.com',
        firstName: 'API',
        lastName: 'Tester',
        fullName: 'API Tester',
      }),
    };
    registrationDraftModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId('64b7f2c15f91f60012d5a333'),
      }),
    };
    paystackService = {
      initializeTransaction: jest.fn().mockResolvedValue({
        status: true,
        data: { authorization_url: 'https://checkout.example.test/session' },
      }),
    };
    cloudinaryService = {
      uploadFile: jest.fn().mockResolvedValue({
        url: 'https://images.example.test/conference.jpg',
        secure_url: 'https://images.example.test/conference.jpg',
        public_id: 'events/conference-test',
      }),
    };
    const service = new EventsService(
      eventModel,
      userModel as any,
      cloudinaryService,
      paystackService,
      {
        get: jest.fn((key: string) =>
          key === 'EVENT_PAYMENT_SUCCESS_URL'
            ? 'https://frontend.example.test/events/[slug]/payment-success'
            : 'https://frontend.example.test',
        ),
      } as any,
      {} as any,
      {
        sendConferenceRegistrationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
      } as any,
      {
        getUserExperienceCategory: jest.fn().mockReturnValue('Student'),
      } as any,
      registrationDraftModel,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: service }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { id: userId };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a conference with admin-designed fields and mixed accommodation options', async () => {
    const registrationFields = [
      {
        id: 'arrival',
        label: 'Arrival window',
        type: 'select',
        required: true,
        options: ['Morning', 'Evening'],
      },
      {
        id: 'notes',
        label: 'Travel notes',
        type: 'longText',
        required: false,
        helpText: 'Tell us anything relevant.',
      },
    ];
    const accommodationOptions = [
      {
        id: 'hostel-info',
        name: 'Hostel information only',
        description: 'Contact the hostel directly.',
        isPriced: false,
      },
      {
        id: 'private-room',
        name: 'Private room',
        isPriced: true,
        priceNgn: 25000,
        priceUsd: 20,
      },
    ];

    await request(app.getHttpServer())
      .post('/events')
      .field('name', 'Admin-created dynamic conference')
      .field('description', 'API integration test')
      .field('eventType', 'Physical')
      .field('linkOrLocation', 'Abuja')
      .field('isPaid', 'true')
      .field('paymentPlans', JSON.stringify([{ role: 'Student', price: 10000 }]))
      .field('eventDateTime', '2027-08-20T09:00:00.000Z')
      .field('eventTags', 'Conference')
      .field('eventTags', 'Seminar')
      .field('membersGroup', 'Student')
      .field('membersGroup', 'Doctor_0_5_Years')
      .field('isConference', 'true')
      .field('conferenceType', 'National')
      .field('accommodationSelectionRequired', 'true')
      .field('accommodationOptions', JSON.stringify(accommodationOptions))
      .field('registrationFields', JSON.stringify(registrationFields))
      .attach('featuredImage', Buffer.from('fake-image-bytes'), 'conference.jpg')
      .expect(({ status, body }) => {
        if (status !== 201) {
          throw new Error(`Unexpected create response: ${JSON.stringify({ status, body })}`);
        }
        expect(body.success).toBe(true);
        expect(body.message).toBe('Conference created successfully');
      });

    expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'conference.jpg' }),
      'events',
    );
    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isConference: true,
        accommodationSelectionRequired: true,
        accommodationOptions: [
          {
            id: 'hostel-info',
            name: 'Hostel information only',
            description: 'Contact the hostel directly.',
            isPriced: false,
            priceNgn: undefined,
            priceUsd: undefined,
          },
          {
            id: 'private-room',
            name: 'Private room',
            description: undefined,
            isPriced: true,
            priceNgn: 25000,
            priceUsd: 20,
          },
        ],
        registrationFields: [
          {
            id: 'arrival',
            label: 'Arrival window',
            type: 'select',
            required: true,
            placeholder: undefined,
            helpText: undefined,
            options: ['Morning', 'Evening'],
          },
          {
            id: 'notes',
            label: 'Travel notes',
            type: 'longText',
            required: false,
            placeholder: undefined,
            helpText: 'Tell us anything relevant.',
            options: [],
          },
        ],
      }),
    );
  });

  it('rejects an invalid customResponses API shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/events/register/dynamic-conference-api-test')
      .send({
        accommodationOptionId: 'hostel-info',
        customResponses: 'not-an-object',
      })
      .expect(400);

    expect(response.body.message).toContain('customResponses must be an object');
    expect(eventModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects registration when the required accommodation is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/events/register/dynamic-conference-api-test')
      .send({ customResponses: { arrival: 'Morning', consent: true } })
      .expect(400);

    expect(response.body.message).toBe('Please select an accommodation option');
    expect(event.save).not.toHaveBeenCalled();
  });

  it('rejects missing required admin-created fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/events/register/dynamic-conference-api-test')
      .send({ accommodationOptionId: 'hostel-info', customResponses: {} })
      .expect(400);

    expect(response.body.message).toBe('Arrival window is required');
    expect(event.save).not.toHaveBeenCalled();
  });

  it('registers a free option and stores normalized response snapshots', async () => {
    await request(app.getHttpServer())
      .post('/events/register/dynamic-conference-api-test')
      .send({
        accommodationOptionId: 'hostel-info',
        customResponses: { arrival: 'Morning', consent: true, diet: 'Vegetarian' },
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.message).toBe('Successfully registered for the conference');
      });

    expect(event.save).toHaveBeenCalledTimes(1);
    expect(event.registeredUsers).toHaveLength(1);
    expect(event.registeredUsers[0]).toMatchObject({
      accommodation: {
        optionId: 'hostel-info',
        name: 'Hostel information only',
        price: 0,
        currency: 'NGN',
      },
      customResponses: { arrival: 'Morning', consent: true, diet: 'Vegetarian' },
    });
  });

  it('adds a priced accommodation and stores answers in the payment draft', async () => {
    await request(app.getHttpServer())
      .post('/events/pay/dynamic-conference-api-test')
      .send({
        accommodationOptionId: 'private-room',
        customResponses: { arrival: 'Evening', consent: true, diet: 'None' },
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.checkout_url).toBe('https://checkout.example.test/session');
      });

    expect(registrationDraftModel.findOneAndUpdate).toHaveBeenCalledWith(
      { eventId: event._id, userId: expect.any(mongoose.Types.ObjectId) },
      {
        $set: expect.objectContaining({
          accommodation: expect.objectContaining({
            optionId: 'private-room',
            price: 25000,
            currency: 'NGN',
          }),
          customResponses: { arrival: 'Evening', consent: true, diet: 'None' },
          expiresAt: expect.any(Date),
        }),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    expect(paystackService.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 3500000,
        currency: 'NGN',
        email: 'student@example.com',
      }),
    );
    const paymentRequest = paystackService.initializeTransaction.mock.calls[0][0];
    expect(paymentRequest.metadata).toContain('registrationDraftId');
    expect(paymentRequest.metadata).not.toContain('arrival');
    expect(paymentRequest.metadata).not.toContain('private-room');
  });
});
