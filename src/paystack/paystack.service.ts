import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IPaystackInitTransaction } from './paystack.interface';

@Injectable()
export class PaystackService {
  constructor(private configService: ConfigService) {}

  async initializeTransaction(data: IPaystackInitTransaction) {
    try {
      const apiUrl = this.configService.get('PAYSTACK_API_URL');
      const apiKey = this.configService.get('PAYSTACK_API_KEY');

      const response = await axios.post(`${apiUrl}/transaction/initialize`, data, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Paystack API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        requestData: error.config?.data,
      });
      throw error;
    }
  }
  async verifyTransaction(reference: string) {
    try {
      const apiUrl = this.configService.get('PAYSTACK_API_URL');
      const apiKey = this.configService.get('PAYSTACK_API_KEY');

      const response = await axios.get(`${apiUrl}/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Paystack Verification Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      throw error;
    }
  }

  /**
   * Paystack's /transaction endpoint does not filter by email address — passing
   * `email=` returns the same transactions for every address. Resolve the
   * customer ID first, then filter transactions by that ID.
   */
  private async getCustomerIdByEmail(email: string): Promise<string | null> {
    const apiUrl = this.configService.get('PAYSTACK_API_URL');
    const apiKey = this.configService.get('PAYSTACK_API_KEY');
    try {
      const response = await axios.get(`${apiUrl}/customer`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        params: { email },
      });
      const customers = response.data?.data;
      if (Array.isArray(customers) && customers.length > 0) {
        return customers[0].id ?? null;
      }
      return null;
    } catch (error) {
      console.error('Paystack Customer Lookup Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      throw error;
    }
  }

  async searchTransactionsByEmail(email: string, page: number = 1, perPage: number = 50) {
    try {
      const apiUrl = this.configService.get('PAYSTACK_API_URL');
      const apiKey = this.configService.get('PAYSTACK_API_KEY');

      const customerId = await this.getCustomerIdByEmail(email);
      if (!customerId) {
        return { status: true, message: 'No Paystack customer found for this email', data: [] };
      }

      const response = await axios.get(`${apiUrl}/transaction`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          customer: customerId,
          perPage,
          page,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Paystack Search Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      throw error;
    }
  }
}
