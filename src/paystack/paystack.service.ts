import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IPaystackInitTransaction } from './paystack.interface';

@Injectable()
export class PaystackService {
  constructor(private configService: ConfigService) {}

  async initializeTransaction(data: IPaystackInitTransaction) {
    const response = await axios.post(
      `${this.configService.get('PAYSTACK_API_URL')}/transaction/initialize`,
      data,
      {
        headers: {
          Authorization: `Bearer ${this.configService.get('PAYSTACK_API_KEY')}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  }

  async verifyTransaction(reference: string) {
    const response = await axios.get(
      `${this.configService.get('PAYSTACK_API_URL')}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.configService.get('PAYSTACK_API_KEY')}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }
}
