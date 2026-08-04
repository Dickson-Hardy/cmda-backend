import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PaystackWebhookData {
  @IsString()
  reference: string;

  @IsObject()
  metadata: Record<string, any>;
}

export class PaystackWebhookDto {
  @IsString()
  event: string;

  @ValidateNested()
  @Type(() => PaystackWebhookData)
  data: PaystackWebhookData;
}
