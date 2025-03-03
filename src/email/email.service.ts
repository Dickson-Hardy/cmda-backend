import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { MEMBER_CREDENTIALS_TEMPLATE, WELCOME_EMAIL_TEMPLATE } from './templates/welcome.template';
import { PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE } from './templates/password-reset.template';
import { PASSWORD_RESET_SUCCESS_EMAIL_TEMPLATE } from './templates/password-success.template';
import { VERIFICATION_CODE_EMAIL_TEMPLATE } from './templates/verification-code.template';
import { ADMIN_CREDENTIALS_TEMPLATE } from './templates/admin-created.template';
import { DONATION_CONFIRMATION_EMAIL_TEMPLATE } from './templates/donation-confirmation.template';
import { SUBSCRIPTION_CONFIRMATION_EMAIL_TEMPLATE } from './templates/subscription-confirm.template';
import { TRANSITION_SUCCESS_EMAIL_TEMPLATE } from './templates/transition-success.template';

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

  async sendMemberCredentialsEmail({ name, email, password }): Promise<{ success: boolean }> {
    try {
      const html = MEMBER_CREDENTIALS_TEMPLATE.replace('[Name]', name)
        .replace('[Email]', email)
        .replace('[Password]', password);
      await this.mailerService.sendMail({
        to: email,
        subject: 'CMDA Member Account Credentials',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendDonationConfirmedEmail({ name, email }): Promise<{ success: boolean }> {
    try {
      const html = DONATION_CONFIRMATION_EMAIL_TEMPLATE.replace('[Name]', name);
      await this.mailerService.sendMail({
        to: email,
        subject: 'Thank You for your Generous Donation',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendSubscriptionConfirmedEmail({ name, email }): Promise<{ success: boolean }> {
    try {
      const html = SUBSCRIPTION_CONFIRMATION_EMAIL_TEMPLATE.replace('[Name]', name);
      await this.mailerService.sendMail({
        to: email,
        subject: 'Thank You for Subscribing',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendTransitionSuccessEmal({
    name,
    email,
    oldRole,
    newRole,
    licenseNumber,
    newRegion,
    specialty,
  }): Promise<{ success: boolean }> {
    try {
      const html = TRANSITION_SUCCESS_EMAIL_TEMPLATE.replace('[Name]', name)
        .replace('[TransitionFrom]', oldRole)
        .replace('[TransitionTo]', newRole)
        .replace('[Specialty]', specialty)
        .replace('[LicenseNumber]', licenseNumber)
        .replace('[Region]', newRegion);
      await this.mailerService.sendMail({
        to: email,
        subject: 'Transition Successful',
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
}
