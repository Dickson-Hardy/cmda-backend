import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { WELCOME_EMAIL_TEMPLATE } from './templates/welcome.template';
import { PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE } from './templates/password-reset.template';
import { PASSWORD_RESET_SUCCESS_EMAIL_TEMPLATE } from './templates/password-success.template';
import { VERIFICATION_CODE_EMAIL_TEMPLATE } from './templates/verification-code.template';
import { ADMIN_CREDENTIALS_TEMPLATE } from './templates/admin-created.template';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendWelcomeEmail({ name, email, code }): Promise<{ success: boolean }> {
    try {
      const html = WELCOME_EMAIL_TEMPLATE.replace('[Name]', name).replace(
        '[VerificationCode]',
        code,
      );
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to CMDA Nigeria',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendPasswordResetTokenEmail({ name, email, code }): Promise<{ success: boolean }> {
    try {
      const html = PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE.replace('[Name]', name).replace(
        '[ResetToken]',
        code,
      );
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendPasswordResetSuccessEmail({ name, email }): Promise<{ success: boolean }> {
    try {
      const html = PASSWORD_RESET_SUCCESS_EMAIL_TEMPLATE.replace('[Name]', name);
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Successful',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendVerificationCodeEmail({ name, email, code }): Promise<{ success: boolean }> {
    try {
      const html = VERIFICATION_CODE_EMAIL_TEMPLATE.replace('[Name]', name).replace(
        '[VerificationCode]',
        code,
      );
      await this.mailerService.sendMail({
        to: email,
        subject: 'Email Verification Code',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendAdminCredentialsEmail({ name, email, password }): Promise<{ success: boolean }> {
    try {
      const html = ADMIN_CREDENTIALS_TEMPLATE.replace('[Name]', name)
        .replace('[Email]', email)
        .replace('[Password]', password);
      await this.mailerService.sendMail({
        to: email,
        subject: 'Admin Login Credentials',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
}
