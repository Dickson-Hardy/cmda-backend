export interface IPaypalCreateOrder {
  amount: number;
  currency: string;
  metadata: string;
  items?: { name: string; quantity: number; amount: number }[];
  description: 'DONATION' | 'SUBSCRIPTION' | 'ORDER' | 'EVENT';
}
