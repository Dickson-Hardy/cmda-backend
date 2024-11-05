import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
    console.log('ACCE');
    const response = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: { username: this.clientId, password: this.clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    return response.data.access_token;
  }

  // Method to create an order
  async createOrder(amount: string) {
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
    const accessToken = await this.getAccessToken();
    const response = await axios.post(
      `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );
    return response.data; // Returns capture details
  }
}
