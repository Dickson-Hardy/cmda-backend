import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ResendFallbackService } from './resend-fallback.service';
import { MEMBER_CREDENTIALS_TEMPLATE, WELCOME_EMAIL_TEMPLATE } from './templates/welcome.template';
import { PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE } from './templates/password-reset.template';
import { PASSWORD_RESET_SUCCESS_EMAIL_TEMPLATE } from './templates/password-success.template';
import { VERIFICATION_CODE_EMAIL_TEMPLATE } from './templates/verification-code.template';
import { ADMIN_CREDENTIALS_TEMPLATE } from './templates/admin-created.template';
import { DONATION_CONFIRMATION_EMAIL_TEMPLATE } from './templates/donation-confirmation.template';
import { SUBSCRIPTION_CONFIRMATION_EMAIL_TEMPLATE } from './templates/subscription-confirm.template';
import { TRANSITION_SUCCESS_EMAIL_TEMPLATE } from './templates/transition-success.template';
import { CONFERENCE_REGISTRATION_CONFIRMATION_TEMPLATE } from './templates/conference-registration.template';
import { CONFERENCE_PAYMENT_CONFIRMATION_TEMPLATE } from './templates/conference-payment.template';
import { CONFERENCE_UPDATE_NOTIFICATION_TEMPLATE } from './templates/conference-update.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private mailerService: MailerService,
    private resendFallback: ResendFallbackService,
  ) {}

  async sendWelcomeEmail({ name, email, code }): Promise<{ success: boolean }> {
    const html = WELCOME_EMAIL_TEMPLATE.replace('[Name]', name).replace('[VerificationCode]', code);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), 45000),
      );

      await Promise.race([
        this.mailerService.sendMail({
          to: email,
          subject: 'Welcome to CMDA Nigeria',
          html,
        }),
        timeoutPromise,
      ]);

      this.logger.log('Welcome email sent via primary SMTP');
      return { success: true };
    } catch (error) {
      this.logger.warn(`Primary email failed: ${error.message}. Trying Resend fallback...`);

      // Try Resend fallback
      if (this.resendFallback.isAvailable()) {
        const fallbackResult = await this.resendFallback.sendEmail({
          to: email,
          subject: 'Welcome to CMDA Nigeria',
          html,
        });

        if (fallbackResult.success) {
          this.logger.log('Welcome email sent via Resend fallback');
          return { success: true };
        }
      }

      this.logger.error('All email services failed for welcome email');
      return { success: false };
    }
  }

  async sendPasswordResetTokenEmail({ name, email, code }): Promise<{ success: boolean }> {
    const html = PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE.replace('[Name]', name).replace(
      '[ResetToken]',
      code,
    );

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), 45000),
      );

      await Promise.race([
        this.mailerService.sendMail({
          to: email,
          subject: 'Password Reset Request',
          html,
        }),
        timeoutPromise,
      ]);

      this.logger.log('Password reset email sent via primary SMTP');
      return { success: true };
    } catch (error) {
      this.logger.warn(`Primary email failed: ${error.message}. Trying Resend fallback...`);

      // Try Resend fallback
      if (this.resendFallback.isAvailable()) {
        const fallbackResult = await this.resendFallback.sendEmail({
          to: email,
          subject: 'Password Reset Request',
          html,
        });

        if (fallbackResult.success) {
          this.logger.log('Password reset email sent via Resend fallback');
          return { success: true };
        }
      }

      this.logger.error('All email services failed for password reset email');
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
    const html = VERIFICATION_CODE_EMAIL_TEMPLATE.replace('[Name]', name).replace(
      '[VerificationCode]',
      code,
    );

    const textContent = `Hello ${name},

Thank you for joining CMDA Nigeria! 

To complete your registration, please enter this code: ${code}

This code will expire in 30 minutes.

If you didn't sign up for CMDA Nigeria, please ignore this email.

Best regards,
The CMDA Nigeria Team

CMDA Nigeria
Wholeness House Gwagwalada, FCT, Nigeria
Email: office@cmdanigeria.org`;

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), 45000),
      );

      await Promise.race([
        this.mailerService.sendMail({
          to: email,
          subject: 'Complete your CMDA Nigeria registration',
          html,
          text: textContent,
          headers: {
            'X-Mailer': 'CMDA Nigeria',
            'List-Unsubscribe': '<mailto:unsubscribe@cmdanigeria.org>',
            'Reply-To': 'office@cmdanigeria.org',
          },
        }),
        timeoutPromise,
      ]);

      this.logger.log('Verification email sent via primary SMTP');
      return { success: true };
    } catch (error) {
      this.logger.warn(`Primary email failed: ${error.message}. Trying Resend fallback...`);

      // Try Resend fallback
      if (this.resendFallback.isAvailable()) {
        const fallbackResult = await this.resendFallback.sendEmail({
          to: email,
          subject: 'Complete your CMDA Nigeria registration',
          html,
          text: textContent,
        });

        if (fallbackResult.success) {
          this.logger.log('Verification email sent via Resend fallback');
          return { success: true };
        }
      }

      this.logger.error('All email services failed for verification email');
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

  async sendConferenceRegistrationConfirmationEmail({
    name,
    email,
    conferenceName,
    conferenceType,
    conferenceScope,
    conferenceDate,
    conferenceVenue,
    registrationPeriod,
    conferenceUrl,
  }): Promise<{ success: boolean }> {
    try {
      const html = CONFERENCE_REGISTRATION_CONFIRMATION_TEMPLATE.replace('[Name]', name)
        .replace(/\[ConferenceName\]/g, conferenceName)
        .replace('[ConferenceType]', conferenceType)
        .replace('[ConferenceScope]', conferenceScope)
        .replace('[ConferenceDate]', conferenceDate)
        .replace('[ConferenceVenue]', conferenceVenue)
        .replace('[RegistrationPeriod]', registrationPeriod)
        .replace('[ConferenceUrl]', conferenceUrl);

      await this.mailerService.sendMail({
        to: email,
        subject: `Registration Confirmed: ${conferenceName}`,
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendConferencePaymentConfirmationEmail({
    name,
    email,
    conferenceName,
    amountPaid,
    registrationPeriod,
    paymentMethod,
    transactionId,
    paymentDate,
    conferenceDate,
    conferenceVenue,
    conferenceType,
    conferenceScope,
    conferenceUrl,
  }): Promise<{ success: boolean }> {
    try {
      const html = CONFERENCE_PAYMENT_CONFIRMATION_TEMPLATE.replace('[Name]', name)
        .replace(/\[ConferenceName\]/g, conferenceName)
        .replace('[AmountPaid]', amountPaid)
        .replace('[RegistrationPeriod]', registrationPeriod)
        .replace('[PaymentMethod]', paymentMethod)
        .replace('[TransactionId]', transactionId)
        .replace('[PaymentDate]', paymentDate)
        .replace('[ConferenceDate]', conferenceDate)
        .replace('[ConferenceVenue]', conferenceVenue)
        .replace('[ConferenceType]', conferenceType)
        .replace('[ConferenceScope]', conferenceScope)
        .replace('[ConferenceUrl]', conferenceUrl);

      await this.mailerService.sendMail({
        to: email,
        subject: `Payment Confirmed: ${conferenceName}`,
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async sendConferenceUpdateNotificationEmail({
    name,
    email,
    conferenceName,
    updateMessage,
    conferenceDate,
    conferenceVenue,
    conferenceType,
    conferenceUrl,
  }): Promise<{ success: boolean }> {
    try {
      const html = CONFERENCE_UPDATE_NOTIFICATION_TEMPLATE.replace('[Name]', name)
        .replace(/\[ConferenceName\]/g, conferenceName)
        .replace('[UpdateMessage]', updateMessage)
        .replace('[ConferenceDate]', conferenceDate)
        .replace('[ConferenceVenue]', conferenceVenue)
        .replace('[ConferenceType]', conferenceType)
        .replace('[ConferenceUrl]', conferenceUrl);

      await this.mailerService.sendMail({
        to: email,
        subject: `Update: ${conferenceName}`,
        html,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
}
