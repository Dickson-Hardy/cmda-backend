import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pricing, PricingType, UserRole, PaymentFrequency, Currency } from './pricing.entity';
import { CreatePricingDto, UpdatePricingDto, PricingQueryDto } from './dto/pricing.dto';

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(Pricing.name)
    private pricingModel: Model<Pricing>,
  ) {}

  async create(createPricingDto: CreatePricingDto): Promise<Pricing> {
    const pricing = new this.pricingModel(createPricingDto);
    return await pricing.save();
  }

  async findAll(query: PricingQueryDto): Promise<Pricing[]> {
    const filter: any = {};

    if (query.type) filter.type = query.type;
    if (query.userRole) filter.userRole = query.userRole;
    if (query.frequency) filter.frequency = query.frequency;
    if (query.currency) filter.currency = query.currency;
    if (query.incomeBracket) filter.incomeBracket = query.incomeBracket;
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    return await this.pricingModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Pricing> {
    const pricing = await this.pricingModel.findById(id).exec();
    if (!pricing) {
      throw new NotFoundException(`Pricing with ID ${id} not found`);
    }
    return pricing;
  }

  async update(id: string, updatePricingDto: UpdatePricingDto): Promise<Pricing> {
    const pricing = await this.pricingModel
      .findByIdAndUpdate(id, updatePricingDto, { new: true })
      .exec();

    if (!pricing) {
      throw new NotFoundException(`Pricing with ID ${id} not found`);
    }

    return pricing;
  }

  async remove(id: string): Promise<void> {
    const result = await this.pricingModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Pricing with ID ${id} not found`);
    }
  }

  // Get subscription price for a specific user role and frequency
  async getSubscriptionPrice(
    userRole: UserRole,
    frequency: PaymentFrequency = PaymentFrequency.ANNUAL,
  ): Promise<number> {
    const pricing = await this.pricingModel
      .findOne({
        type: PricingType.SUBSCRIPTION,
        userRole,
        frequency,
        isActive: true,
      })
      .exec();

    if (!pricing) {
      // Fallback to constants if no database entry found
      const fallbackPrices = {
        [UserRole.STUDENT]: 1000,
        [UserRole.DOCTOR]: 10000,
        [UserRole.DOCTOR_SENIOR]: 20000,
        [UserRole.GLOBAL_NETWORK]: 100,
        [UserRole.LIFE_MEMBER]: 250000,
      };
      return fallbackPrices[userRole] || 1000;
    }

    return pricing.amount;
  }

  // Get income-based pricing for Global Network users
  async getIncomeBasedPrice(incomeBracket: string, frequency: PaymentFrequency): Promise<number> {
    const pricing = await this.pricingModel
      .findOne({
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency,
        incomeBracket,
        isActive: true,
      })
      .exec();

    if (!pricing) {
      // Fallback to constants
      const fallbackPrices = {
        greater_than_200k: { monthly: 40, annual: 400 },
        '100k_to_200k': { monthly: 30, annual: 300 },
        '50k_to_100k': { monthly: 20, annual: 200 },
        less_than_50k: { monthly: 10, annual: 100 },
        students_unemployed: { monthly: 1, annual: 10 },
      };
      return fallbackPrices[incomeBracket]?.[frequency] || 100;
    }

    return pricing.amount;
  }

  // Get lifetime membership price
  async getLifetimePrice(membershipType: string): Promise<number> {
    const pricing = await this.pricingModel
      .findOne({
        type: PricingType.LIFETIME,
        frequency: PaymentFrequency.LIFETIME,
        incomeBracket: membershipType, // Using incomeBracket field to store membership type
        isActive: true,
      })
      .exec();

    if (!pricing) {
      // Fallback to constants
      const fallbackPrices = {
        gold: 6000,
        platinum: 8000,
        diamond: 10000,
      };
      return fallbackPrices[membershipType] || 6000;
    }

    return pricing.amount;
  }

  // Initialize default pricing data
  async initializeDefaultPricing(): Promise<void> {
    const existingPricing = await this.pricingModel.countDocuments();
    if (existingPricing > 0) {
      return; // Already initialized
    }

    const defaultPricing = [
      // Standard subscription pricing (NGN)
      {
        type: PricingType.SUBSCRIPTION,
        userRole: UserRole.STUDENT,
        frequency: PaymentFrequency.ANNUAL,
        amount: 1000,
        currency: Currency.NGN,
      },
      {
        type: PricingType.SUBSCRIPTION,
        userRole: UserRole.DOCTOR,
        frequency: PaymentFrequency.ANNUAL,
        amount: 10000,
        currency: Currency.NGN,
      },
      {
        type: PricingType.SUBSCRIPTION,
        userRole: UserRole.DOCTOR_SENIOR,
        frequency: PaymentFrequency.ANNUAL,
        amount: 20000,
        currency: Currency.NGN,
      },
      {
        type: PricingType.SUBSCRIPTION,
        userRole: UserRole.LIFE_MEMBER,
        frequency: PaymentFrequency.LIFETIME,
        amount: 250000,
        currency: Currency.NGN,
      },

      // Global Network income-based pricing (USD)
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.MONTHLY,
        amount: 40,
        currency: Currency.USD,
        incomeBracket: 'greater_than_200k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.ANNUAL,
        amount: 400,
        currency: Currency.USD,
        incomeBracket: 'greater_than_200k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.MONTHLY,
        amount: 30,
        currency: Currency.USD,
        incomeBracket: '100k_to_200k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.ANNUAL,
        amount: 300,
        currency: Currency.USD,
        incomeBracket: '100k_to_200k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.MONTHLY,
        amount: 20,
        currency: Currency.USD,
        incomeBracket: '50k_to_100k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.ANNUAL,
        amount: 200,
        currency: Currency.USD,
        incomeBracket: '50k_to_100k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.MONTHLY,
        amount: 10,
        currency: Currency.USD,
        incomeBracket: 'less_than_50k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.ANNUAL,
        amount: 100,
        currency: Currency.USD,
        incomeBracket: 'less_than_50k',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.MONTHLY,
        amount: 1,
        currency: Currency.USD,
        incomeBracket: 'students_unemployed',
      },
      {
        type: PricingType.INCOME_BASED,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.ANNUAL,
        amount: 10,
        currency: Currency.USD,
        incomeBracket: 'students_unemployed',
      },

      // Lifetime memberships (USD)
      {
        type: PricingType.LIFETIME,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.LIFETIME,
        amount: 6000,
        currency: Currency.USD,
        incomeBracket: 'gold',
        description: 'Lifetime Gold (15 years)',
      },
      {
        type: PricingType.LIFETIME,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.LIFETIME,
        amount: 8000,
        currency: Currency.USD,
        incomeBracket: 'platinum',
        description: 'Lifetime Platinum (20 years)',
      },
      {
        type: PricingType.LIFETIME,
        userRole: UserRole.GLOBAL_NETWORK,
        frequency: PaymentFrequency.LIFETIME,
        amount: 10000,
        currency: Currency.USD,
        incomeBracket: 'diamond',
        description: 'Lifetime Diamond (25 years)',
      },
    ];

    for (const pricingData of defaultPricing) {
      const pricing = new this.pricingModel(pricingData);
      await pricing.save();
    }
  }
}
