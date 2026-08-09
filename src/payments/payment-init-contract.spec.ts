import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InitDonationDto } from '../donations/dto/init-donation.dto';
import { InitSubscriptionDto } from '../subscriptions/dto/init-subscription.dto';

async function invalidProperties<T extends object>(type: new () => T, payload: object) {
  const errors = await validate(plainToInstance(type, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return errors.map((error) => error.property);
}

describe('Payment initialization request contracts', () => {
  it.each([
    { targetYear: 2026 },
    { selectedTab: 'regular', incomeBracket: 'less_than_50k', targetYear: 2026 },
    { selectedTab: 'lifetime', lifetimeType: 'gold' },
    { isNigerianLifetime: true },
  ])('accepts a supported subscription payload', async (payload) => {
    await expect(invalidProperties(InitSubscriptionDto, payload)).resolves.toEqual([]);
  });

  it('rejects legacy client-only subscription fields', async () => {
    const properties = await invalidProperties(InitSubscriptionDto, {
      selectedTab: 'subscriptions',
      amount: 50,
      currency: 'USD',
      provider: 'PAYPAL',
    });

    expect(properties).toEqual(
      expect.arrayContaining(['selectedTab', 'amount', 'currency', 'provider']),
    );
  });

  it('accepts the donation payload shared by web and mobile', async () => {
    const properties = await invalidProperties(InitDonationDto, {
      totalAmount: 500,
      recurring: false,
      areasOfNeed: [{ name: 'General Donation', amount: 500 }],
      currency: 'NGN',
    });

    expect(properties).toEqual([]);
  });

  it('rejects client-selected donation gateways', async () => {
    const properties = await invalidProperties(InitDonationDto, {
      totalAmount: 500,
      recurring: false,
      areasOfNeed: [{ name: 'General Donation', amount: 500 }],
      currency: 'NGN',
      provider: 'PAYSTACK',
      gateway: 'PAYSTACK',
    });

    expect(properties).toEqual(expect.arrayContaining(['provider', 'gateway']));
  });
});
