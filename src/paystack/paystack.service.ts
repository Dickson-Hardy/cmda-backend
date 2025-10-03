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

      console.log('Paystack API URL:', apiUrl);
      console.log('Paystack API Key exists:', !!apiKey);
      console.log('Transaction data:', data);

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
      });
      throw error;
    }
  }
  async verifyTransaction(reference: string) {
    try {
      const apiUrl = this.configService.get('PAYSTACK_API_URL');
      const apiKey = this.configService.get('PAYSTACK_API_KEY');

      console.log('Verifying Paystack transaction:', reference);

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
}
