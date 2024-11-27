import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IPaypalCreateOrder } from './paypal.interface';

@Injectable()
export class PaypalService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor(private config: ConfigService) {
    this.clientId = this.config.get('PAYPAL_CLIENT_ID');
    this.clientSecret = this.config.get('PAYPAL_CLIENT_SECRET');
    this.baseUrl = this.config.get('PAYPAL_API_URL');
  }

  // Method to get PayPal OAuth token
  private async getAccessToken() {
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
      console.error('PAYPAL_TOKEN', error.message);
      console.log('ERROR', error.response.data.error_description);
      throw new InternalServerErrorException(error.response.data.error_description);
    }
  }

  // Method to create an order
  async createOrder({ amount, currency, description, metadata, items }: IPaypalCreateOrder) {
    const accessToken = await this.getAccessToken();
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
            breakdown: {
              item_total: { currency_code: currency, value: amount },
            },
          },
          custom_id: Buffer.from(metadata).toString('base64'), // convert JSON stringified metadata to base64
          description: description,
          items: items.map((item) => ({
            name: item.name,
            unit_amount: { currency_code: currency, value: item.amount },
            quantity: item.quantity,
          })),
        },
      ],
      application_context: {
        brand_name: 'CMDA Nigeria',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    };

    try {
      const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, orderData, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      return response.data; // Returns order ID and status
    } catch (error) {
      console.error(error.response.data);
      throw new InternalServerErrorException(error.response.data.error_description);
    }
  }

  async _createOrder(amount: string) {
    const accessToken = await this.getAccessToken();
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
        },
      ],
    };

    const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, orderData, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    return response.data; // Returns order ID and status
  }

  // Method to capture payment
  async captureOrder(orderId: string) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
      );
      return response.data; // Returns capture details
    } catch (error) {
      console.error('ERR', error);
    }
  }

  // Method to get order details
  async getOrderDetails(orderId: string) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      // console.log('RES', response.data);
      return response.data; // Returns order details
    } catch (error) {
      console.error('ERR', error);
    }
  }
}
