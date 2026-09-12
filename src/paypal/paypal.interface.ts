export interface IPaypalCreateOrder {
  amount: number;
  currency: string;
  customId: string;
  requestId?: string;
  items: { name: string; quantity: number; amount: number }[];
  description: 'DONATION' | 'SUBSCRIPTION' | 'ORDER' | 'EVENT' | 'CONFERENCE';
  returnUrl?: string;
  cancelUrl?: string;
}
