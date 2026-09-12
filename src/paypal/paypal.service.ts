import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { IPaypalCreateOrder } from './paypal.interface';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor(private config: ConfigService) {
    this.clientId = this.config.get('PAYPAL_CLIENT_ID');
    this.clientSecret = this.config.get('PAYPAL_CLIENT_SECRET');
    this.baseUrl = this.config.get('PAYPAL_API_URL');
  }

  private assertConfigured() {
    if (!this.clientId || !this.clientSecret || !this.baseUrl) {
      throw new ServiceUnavailableException('PayPal is not configured');
    }
  }

  private formatAmount(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('PayPal amount must be greater than zero');
    }
    return value.toFixed(2);
  }

  private throwPaypalError(error: unknown, operation: string): never {
    const axiosError = error as AxiosError<any>;
    const response = axiosError.response;
    const debugId = response?.headers?.['paypal-debug-id'];
    const providerMessage =
      response?.data?.details?.[0]?.description ||
      response?.data?.message ||
      response?.data?.error_description;
    this.logger.error(
      `${operation} failed${response?.status ? ` (${response.status})` : ''}${debugId ? ` [${debugId}]` : ''}: ${providerMessage || axiosError.message || 'Unknown error'}`,
    );
    throw new BadGatewayException(providerMessage || `PayPal ${operation} failed`);
  }

  // Method to get PayPal OAuth token
  private async getAccessToken() {
    this.assertConfigured();
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: this.clientId, password: this.clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return response.data.access_token;
    } catch (error) {
      this.throwPaypalError(error, 'authentication');
    }
  }

  // Method to create an order
  async createOrder({
    amount,
    currency,
    description,
    customId,
    requestId,
    items,
    returnUrl,
    cancelUrl,
  }: IPaypalCreateOrder) {
    if (!customId || customId.length > 255) {
      throw new BadRequestException('PayPal custom ID must be between 1 and 255 characters');
    }
    if (!items?.length) {
      throw new BadRequestException('At least one PayPal item is required');
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException('PayPal currency must be a three-letter code');
    }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      throw new BadRequestException('PayPal item quantity must be a positive whole number');
    }
    const formattedAmount = this.formatAmount(amount);
    const itemTotal = items.reduce((total, item) => total + item.amount * item.quantity, 0);
    if (Math.round(itemTotal * 100) !== Math.round(amount * 100)) {
      throw new BadRequestException('PayPal item total does not match the order amount');
    }

    const accessToken = await this.getAccessToken();
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: formattedAmount,
            breakdown: {
              item_total: { currency_code: currency, value: formattedAmount },
            },
          },
          custom_id: customId,
          description: description,
          items: items.map((item) => ({
            name: item.name,
            unit_amount: { currency_code: currency, value: this.formatAmount(item.amount) },
            quantity: String(item.quantity),
          })),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'CMDA Nigeria',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            ...(returnUrl ? { return_url: returnUrl } : {}),
            ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
          },
        },
      },
    };

    try {
      const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, orderData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': requestId || randomUUID(),
        },
      });
      return response.data; // Returns order ID and status
    } catch (error) {
      this.throwPaypalError(error, 'order creation');
    }
  }

  async _createOrder(amount: string) {
    const accessToken = await this.getAccessToken();
    const formattedAmount = this.formatAmount(Number(amount));
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: formattedAmount,
          },
        },
      ],
    };

    try {
      const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, orderData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': randomUUID(),
        },
      });
      return response.data;
    } catch (error) {
      this.throwPaypalError(error, 'admin order creation');
    }
  }

  // Method to capture payment
  async captureOrder(orderId: string) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `capture-${orderId}`.slice(0, 38),
          },
        },
      );
      return response.data; // Returns capture details
    } catch (error) {
      this.throwPaypalError(error, 'order capture');
    }
  }

  async captureOrGetCompletedOrder(orderId: string) {
    const existingOrder = await this.getOrderDetails(orderId);
    if (existingOrder.status === 'COMPLETED') {
      return existingOrder;
    }
    return this.captureOrder(orderId);
  }

  // Method to get order details
  async getOrderDetails(orderId: string) {
    if (!orderId || orderId === 'null' || orderId === 'undefined') {
      throw new BadRequestException('Invalid PayPal order ID');
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      return response.data; // Returns order details
    } catch (error) {
      this.throwPaypalError(error, 'order lookup');
    }
  }

  async verifyWebhookSignature(headers: Record<string, string | undefined>, webhookEvent: any) {
    const webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID');
    if (!webhookId) {
      throw new ServiceUnavailableException('PayPal webhook is not configured');
    }
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': randomUUID(),
          },
        },
      );
      return response.data?.verification_status === 'SUCCESS';
    } catch (error) {
      this.throwPaypalError(error, 'webhook verification');
    }
  }
}
