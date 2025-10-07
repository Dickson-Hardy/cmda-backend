import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResendFallbackService {
  private readonly logger = new Logger(ResendFallbackService.name);
  private resend: any;

  constructor(private configService: ConfigService) {
    this.initializeResend();
  }

  private async initializeResend() {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured - fallback email unavailable');
      return;
    }

    try {
      // Dynamically import Resend (install with: npm install resend)
      const { Resend } = await import('resend');
      this.resend = new Resend(apiKey);
      this.logger.log('Resend fallback service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Resend. Install with: npm install resend', error);
    }
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
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.resend) {
      return {
        success: false,
        error: 'Resend not initialized - check RESEND_API_KEY',
      };
    }

    try {
      const fromEmail =
        this.configService.get<string>('RESEND_FROM_EMAIL') ||
        this.configService.get<string>('EMAIL_FROM') ||
        'CMDA Nigeria <onboarding@resend.dev>'; // Use Resend's test email if not configured

      this.logger.log(`Sending fallback email via Resend to ${to}`);

      const result = await this.resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html,
        text: text || undefined,
      });

      if (result.error) {
        this.logger.error('Resend API error:', result.error);
        return { success: false, error: result.error.message };
      }

      this.logger.log(`Fallback email sent successfully via Resend (ID: ${result.data?.id})`);
      return { success: true };
    } catch (error) {
      this.logger.error('Resend fallback failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a simple text email via Resend
   */
  async sendSimpleEmail(to: string, subject: string, message: string): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      subject,
      html: `<p>${message}</p>`,
      text: message,
    });

    return result.success;
  }

  /**
   * Check if Resend is available and configured
   */
  isAvailable(): boolean {
    return !!this.resend;
  }
}
