import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AWS SES Email Service
 * 
 * Cost: $0.10 per 1,000 emails
 * Free tier: 200 emails/day for 12 months
 * After free tier: Unlimited emails (pay per use)
 * 
 * Setup:
 * 1. npm install @aws-sdk/client-ses
 * 2. Add to .env:
 *    AWS_REGION=us-east-1
 *    AWS_ACCESS_KEY_ID=your_key
 *    AWS_SECRET_ACCESS_KEY=your_secret
 *    AWS_SES_FROM_EMAIL=noreply@cmdanigeria.org
 * 3. Verify domain in AWS SES console
 */

@Injectable()
export class AwsSesService {
  private readonly logger = new Logger(AwsSesService.name);
  private sesClient: any;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private async initialize() {
    try {
      const region = this.configService.get('AWS_REGION');
      const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

      if (!region || !accessKeyId || !secretAccessKey) {
        this.logger.warn('AWS SES not configured. Skipping initialization.');
        return;
      }

      // Dynamically import AWS SDK (only if configured)
      const { SESClient } = await import('@aws-sdk/client-ses');
      
      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.isConfigured = true;
      this.logger.log('AWS SES initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize AWS SES: ${error.message}`);
      this.isConfigured = false;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'AWS SES not configured' };
    }

    try {
      const { SendEmailCommand } = await import('@aws-sdk/client-ses');
      
      const fromEmail = this.configService.get('AWS_SES_FROM_EMAIL') || 'noreply@cmdanigeria.org';

      const command = new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
            ...(text && {
              Text: {
                Data: text,
                Charset: 'UTF-8',
              },
            }),
          },
        },
      });

      const response = await this.sesClient.send(command);

      this.logger.log(`Email sent via AWS SES to ${to}. MessageId: ${response.MessageId}`);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      this.logger.error(`AWS SES send failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
