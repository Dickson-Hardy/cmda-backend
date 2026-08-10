import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService payment integrity', () => {
  const product = {
    _id: { toString: () => 'product-1' },
    name: 'CMDA Shirt',
    price: 5000,
    priceUSD: 10,
    stock: 8,
    sizes: ['M'],
    additionalImages: [{ color: 'Green', imageUrl: 'x', imageCloudId: 'x' }],
  };

  function setup() {
    const orderModel: any = {
      create: jest.fn().mockImplementation(async (value) => ({ _id: 'order-1', ...value })),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    };
    const productModel: any = {
      find: jest.fn().mockResolvedValue([product]),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    };
    const paystack: any = {
      initializeTransaction: jest.fn().mockResolvedValue({
        status: true,
        data: { authorization_url: 'https://checkout.test', reference: 'provider-ref' },
      }),
      verifyTransaction: jest.fn(),
    };
    const paypal: any = { createOrder: jest.fn(), captureOrder: jest.fn() };
    const intents: any = {
      createIntent: jest.fn().mockResolvedValue({ id: 'intent-1', intentCode: 'ORDER-1' }),
      linkContextEntity: jest.fn(),
      attachCheckoutData: jest.fn(),
      updateProviderReference: jest.fn(),
      markAsSuccessful: jest.fn(),
    };
    const service = new OrdersService(
      orderModel,
      productModel,
      paystack,
      paypal,
      { get: jest.fn() } as any,
      intents,
    );
    return { service, orderModel, productModel, paystack, intents };
  }

  it('ignores a client total and charges the catalog price', async () => {
    const { service, orderModel, paystack, intents } = setup();
    await service.init('user-1', {
      totalAmount: 1,
      products: [{ product: 'product-1' as any, quantity: 2, size: 'M', color: 'Green' }],
      shippingContactName: 'Member',
      shippingContactEmail: 'member@example.com',
      shippingContactPhone: '+2348012345678',
      shippingAddress: 'Abuja',
      source: 'PAYSTACK',
    });

    expect(intents.createIntent).toHaveBeenCalledWith(expect.objectContaining({ amount: 10000 }));
    expect(paystack.initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1_000_000 }),
    );
    expect(orderModel.create).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: 10000 }));
  });

  it('rejects a provider amount that does not match the stored order', async () => {
    const { service, orderModel, paystack } = setup();
    const pending = {
      _id: 'order-1',
      user: { toString: () => 'user-1' },
      currency: 'NGN',
      totalAmount: 5000,
      isPaid: false,
      products: [{ product: 'product-1', quantity: 1 }],
    };
    orderModel.findById.mockResolvedValue(pending);
    paystack.verifyTransaction.mockResolvedValue({
      status: true,
      data: { status: 'success', amount: 100, metadata: { orderId: 'order-1' } },
    });

    await expect(service.create('user-1', { reference: 'ref', source: 'paystack' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not let another member confirm an order payment', async () => {
    const { service, orderModel, paystack } = setup();
    orderModel.findById.mockResolvedValue({
      _id: 'order-1',
      user: { toString: () => 'other-user' },
      isPaid: false,
    });
    paystack.verifyTransaction.mockResolvedValue({
      status: true,
      data: { status: 'success', amount: 500000, metadata: { orderId: 'order-1' } },
    });

    await expect(service.create('user-1', { reference: 'ref', source: 'paystack' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
