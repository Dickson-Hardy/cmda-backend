export interface IPaystackInitTransaction {
  amount: number;
  email: string;
  reference?: string;
  callback_url?: string;
  channels?: string[];
  metadata?: string;
}
