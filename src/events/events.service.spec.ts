import { BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';

describe('EventsService date filters', () => {
  const createService = () => {
    const skip = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ skip });
    const sort = jest.fn().mockReturnValue({ limit });
    const find = jest.fn().mockReturnValue({ sort });
    const countDocuments = jest.fn().mockResolvedValue(0);
    const eventModel = { find, countDocuments };

    const service = new EventsService(
      eventModel as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );

    return { service, find };
  };

  it('builds an inclusive eventDateTime range', async () => {
    const { service, find } = createService();

    await service.findAll({ fromDate: '2026-08-02', toDate: '2026-08-08' });

    expect(find).toHaveBeenCalledWith({
      eventDateTime: {
        $gte: new Date('2026-08-02T00:00:00+01:00'),
        $lte: new Date('2026-08-08T23:59:59+01:00'),
      },
    });
  });

  it('rejects conflicting date modes before querying MongoDB', async () => {
    const { service, find } = createService();

    await expect(
      service.findAll({ eventDate: '2026-08-02', fromToday: 'true' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(find).not.toHaveBeenCalled();
  });

  it('rejects an incomplete range', async () => {
    const { service, find } = createService();

    await expect(service.findAll({ fromDate: '2026-08-02' })).rejects.toBeInstanceOf(BadRequestException);
    expect(find).not.toHaveBeenCalled();
  });
});

describe('EventsService accommodation options', () => {
  const service = new EventsService(
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
  );

  it('normalizes informational and price-tagged options', () => {
    const options = (service as any).parseAccommodationOptions(
      JSON.stringify([
        { id: 'included', name: 'Hostel information', isPriced: false, priceNgn: 5000 },
        { id: 'private', name: 'Private room', isPriced: true, priceNgn: '25000', priceUsd: '20' },
      ]),
    );

    expect(options).toEqual([
      {
        id: 'included',
        name: 'Hostel information',
        description: undefined,
        isPriced: false,
        priceNgn: undefined,
        priceUsd: undefined,
      },
      {
        id: 'private',
        name: 'Private room',
        description: undefined,
        isPriced: true,
        priceNgn: 25000,
        priceUsd: 20,
      },
    ]);
  });

  it('requires at least one currency for a price-tagged option', () => {
    expect(() =>
      (service as any).parseAccommodationOptions(
        JSON.stringify([{ id: 'private', name: 'Private room', isPriced: true }]),
      ),
    ).toThrow(BadRequestException);
  });

  it('resolves the attendee currency and enforces required selection', () => {
    const event = {
      accommodationSelectionRequired: true,
      accommodationOptions: [
        { id: 'private', name: 'Private room', isPriced: true, priceNgn: 25000, priceUsd: 20 },
      ],
    };

    expect(() =>
      (service as any).resolveAccommodationSelection(event, undefined, 'Doctor'),
    ).toThrow(BadRequestException);
    expect((service as any).resolveAccommodationSelection(event, 'private', 'Doctor')).toMatchObject({
      price: 25000,
      currency: 'NGN',
    });
    expect(
      (service as any).resolveAccommodationSelection(event, 'private', 'GlobalNetwork'),
    ).toMatchObject({ price: 20, currency: 'USD' });
  });

  it('normalizes admin-created registration fields', () => {
    const fields = (service as any).parseRegistrationFields(
      JSON.stringify([
        { id: 'diet', label: 'Dietary needs', type: 'longText' },
        { id: 'arrival', label: 'Arrival window', type: 'select', required: true, options: ['Morning', 'Evening'] },
      ]),
    );

    expect(fields).toEqual([
      {
        id: 'diet',
        label: 'Dietary needs',
        type: 'longText',
        required: false,
        placeholder: undefined,
        helpText: undefined,
        options: [],
      },
      {
        id: 'arrival',
        label: 'Arrival window',
        type: 'select',
        required: true,
        placeholder: undefined,
        helpText: undefined,
        options: ['Morning', 'Evening'],
      },
    ]);
  });

  it('validates required fields and configured choices', () => {
    const event = {
      registrationFields: [
        { id: 'arrival', label: 'Arrival window', type: 'select', required: true, options: ['Morning', 'Evening'] },
        { id: 'consent', label: 'Photo consent', type: 'checkbox', required: true },
      ],
    };

    expect(() => (service as any).validateRegistrationResponses(event, {})).toThrow(BadRequestException);
    expect(() =>
      (service as any).validateRegistrationResponses(event, { arrival: 'Night', consent: true }),
    ).toThrow(BadRequestException);
    expect(
      (service as any).validateRegistrationResponses(event, { arrival: 'Morning', consent: true }),
    ).toEqual({ arrival: 'Morning', consent: true });
  });
});
