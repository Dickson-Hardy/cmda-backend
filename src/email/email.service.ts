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
import { PASSWORD_CHANGE_REMINDER_TEMPLATE } from './templates/password-reminder.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private mailerService: MailerService,
    private resendFallback: ResendFallbackService,
  ) {}

  async sendWelcomeEmail({ name, email, code }): Promise<{ success: boolean }> {
    const html = WELCOME_EMAIL_TEMPLATE.replace('[Name]', name).replace('[VerificationCode]', code);

    // Send email asynchronously without blocking
    this.sendEmailAsync({
      to: email,
      subject: 'Welcome to CMDA Nigeria',
      html,
      priority: 'high',
    });

    // Return immediately
    return { success: true };
  }

  async sendPasswordResetTokenEmail({ name, email, code }): Promise<{ success: boolean }> {
    const html = PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE.replace('[Name]', name).replace(
      '[ResetToken]',
      code,
    );

    // Send email asynchronously without blocking
    this.sendEmailAsync({
      to: email,
      subject: 'Password Reset Request',
      html,
      priority: 'critical',
    });

    // Return immediately
    return { success: true };
  }

  async sendPasswordResetSuccessEmail({ name, email }): Promise<{ success: boolean }> {
    const html = PASSWORD_RESET_SUCCESS_EMAIL_TEMPLATE.replace('[Name]', name);

    // Try Resend first
    if (this.resendFallback.isAvailable()) {
      try {
        const result = await this.resendFallback.sendEmail({
          to: email,
          subject: 'Password Reset Successful',
          html,
        });

        if (result.success) {
          this.logger.log('Password reset success email sent via Resend API');
          return { success: true };
        }
      } catch (error) {
        this.logger.warn(`Resend failed: ${error.message}. Trying SMTP fallback...`);
      }
    }

    // Fallback to SMTP
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Successful',
        html,
      });
      this.logger.log('Password reset success email sent via SMTP fallback');
      return { success: true };
    } catch (error) {
      this.logger.error('All email services failed for password reset success email');
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
CMDA Nigeria Team

CMDA Nigeria
Wholeness House Gwagwalada, FCT, Nigeria
Email: office@cmdanigeria.org`;

    // Send email asynchronously without blocking
    this.sendEmailAsync({
      to: email,
      subject: 'Complete your CMDA Nigeria registration',
      html,
      text: textContent,
      priority: 'critical',
    });

    // Return immediately
    return { success: true };
  }

  private async sendEmailAsync(emailData: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    priority?: 'critical' | 'high' | 'normal' | 'low';
  }): Promise<void> {
    // Run in background without blocking
    setImmediate(async () => {
      try {
        // Try Resend first (faster, more reliable on cloud)
        if (this.resendFallback.isAvailable()) {
          try {
            const result = await this.resendFallback.sendEmail({
              to: emailData.to,
              subject: emailData.subject,
              html: emailData.html,
              text: emailData.text,
            });

            if (result.success) {
              this.logger.log(`Email sent to ${emailData.to} via Resend API`);
              return;
            }
          } catch (error) {
            this.logger.warn(`Resend failed: ${error.message}. Trying SMTP fallback...`);
          }
        }

        // Fallback to SMTP with shorter timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Email send timeout')), 30000),
        );

        await Promise.race([
          this.mailerService.sendMail({
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            headers: {
              'X-Mailer': 'CMDA Nigeria',
              'X-Priority': emailData.priority === 'critical' ? '1' : '3',
              'List-Unsubscribe': '<mailto:unsubscribe@cmdanigeria.org>',
              'Reply-To': 'office@cmdanigeria.org',
            },
          }),
          timeoutPromise,
        ]);

        this.logger.log(`Email sent to ${emailData.to} via SMTP`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${emailData.to}: ${error.message}`);
        // Could log to database here for retry later
      }
    });
  }

  async sendAdminCredentialsEmail({ name, email, password }): Promise<{ success: boolean }> {
    const html = ADMIN_CREDENTIALS_TEMPLATE.replace('[Name]', name)
      .replace('[Email]', email)
      .replace('[Password]', password);

    // Try Resend first
    if (this.resendFallback.isAvailable()) {
      try {
        const result = await this.resendFallback.sendEmail({
          to: email,
          subject: 'Admin Login Credentials',
          html,
        });

        if (result.success) {
          this.logger.log('Admin credentials email sent via Resend API');
          return { success: true };
        }
      } catch (error) {
        this.logger.warn(`Resend failed: ${error.message}. Trying SMTP fallback...`);
      }
    }

    // Fallback to SMTP
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Admin Login Credentials',
        html,
      });
      this.logger.log('Admin credentials email sent via SMTP fallback');
      return { success: true };
    } catch (error) {
      this.logger.error('All email services failed for admin credentials email');
      return { success: false };
    }
  }

  async sendMemberCredentialsEmail({
    name,
    email,
    password,
    userId,
  }): Promise<{ success: boolean }> {
    // Add tracking pixel to email
    const trackingPixel = userId
      ? `<img src="https://api.cmdanigeria.net/api/admin/members/track-email/${userId}" width="1" height="1" alt="" style="display:none" />`
      : '';

    const html = MEMBER_CREDENTIALS_TEMPLATE.replace('[Name]', name)
      .replace('[Email]', email)
      .replace('[Password]', password)
      .replace('</div>', `${trackingPixel}</div>`);

    // Try Resend first
    if (this.resendFallback.isAvailable()) {
      try {
        const result = await this.resendFallback.sendEmail({
          to: email,
          subject: 'CMDA Member Account Credentials',
          html,
        });

        if (result.success) {
          this.logger.log('Member credentials email sent via Resend API');
          return { success: true };
        }
      } catch (error) {
        this.logger.warn(`Resend failed: ${error.message}. Trying SMTP fallback...`);
      }
    }

    // Fallback to SMTP
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'CMDA Member Account Credentials',
        html,
      });
      this.logger.log('Member credentials email sent via SMTP fallback');
      return { success: true };
    } catch (error) {
      this.logger.error('All email services failed for member credentials email');
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

  async sendLifetimeMembershipEmail({
    name,
    email,
    membershipType,
    years,
    expiryDate,
  }): Promise<{ success: boolean }> {
    try {
      const html = `
<div style="margin: 0; padding: 0; font-family: 'Roboto', sans-serif">
<table
    width="100%"
    border="0"
    cellspacing="0"
    cellpadding="0"
    style="background-color: #f4f4f4; padding: 20px"
>
    <tr>
    <td align="center">
        <table
        width="600"
        border="0"
        cellspacing="0"
        cellpadding="0"
        style="background-color: #ffffff; border-radius: 8px; overflow: hidden"
        >
        <!-- Header -->
        <tr>
            <td align="center" style="background-color: #994279; padding: 40px 0">
             <img
              src="https://cmdanigeria.net/CMDALogo.svg"
              alt="CMDA Nigeria"
              width="200"
              height="56"
              style="display: block"
            />
            <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">🎉 Lifetime Membership Activated!</h1>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Dear ${name},</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Congratulations! Your <strong>Lifetime ${membershipType}</strong> membership has been successfully activated.
            </p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; border-left: 4px solid #994279; margin: 20px 0">
                <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0">Membership Details:</h3>
                <p style="color: #666666; font-size: 16px; line-height: 1.8; margin: 5px 0">
                    <strong>Membership Type:</strong> ${membershipType}
                </p>
                ${membershipType.includes('Nigerian') ? '' : `
                <p style="color: #666666; font-size: 16px; line-height: 1.8; margin: 5px 0">
                    <strong>Duration:</strong> ${years} years
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.8; margin: 5px 0">
                    <strong>Expiry Date:</strong> ${expiryDate}
                </p>
                `}
            </div>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                As a lifetime member, you now have access to all CMDA Nigeria benefits and services!
            </p>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Thank you for being so committed to CMDA Nigeria. We look forward to serving you.
            </p>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 40px 0 0 0">
                Best regards,<br />
                CMDA Nigeria Team
            </p>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td align="center" style="background-color: #f4f4f4; padding: 20px 0">
            <p style="color: #666666; font-size: 14px; margin: 0">
                &copy; ${new Date().getFullYear()} CMDA Nigeria. All rights reserved.
            </p>
            <p style="color: #666666; font-size: 14px; margin: 4px 0">
                Wholeness House Gwagwalada, FCT, Nigeria.
            </p>
            <p style="color: #666666; font-size: 14px; margin: 0">
                <a href="#" style="color: #994279; text-decoration: none">Unsubscribe</a>
            </p>
            </td>
        </tr>
        </table>
    </td>
    </tr>
</table>
</div>
      `;

      await this.mailerService.sendMail({
        to: email,
        subject: `🎉 Lifetime Membership Activated - ${membershipType}`,
        html,
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send lifetime membership email: ${error.message}`);
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
    const html = TRANSITION_SUCCESS_EMAIL_TEMPLATE.replace('[Name]', name)
      .replace('[TransitionFrom]', oldRole)
      .replace('[TransitionTo]', newRole)
      .replace('[Specialty]', specialty)
      .replace('[LicenseNumber]', licenseNumber)
      .replace('[Region]', newRegion);

    // Try Resend first
    if (this.resendFallback.isAvailable()) {
      try {
        const result = await this.resendFallback.sendEmail({
          to: email,
          subject: 'Transition Successful',
          html,
        });

        if (result.success) {
          this.logger.log('Transition success email sent via Resend API');
          return { success: true };
        }
      } catch (error) {
        this.logger.warn(`Resend failed: ${error.message}. Trying SMTP fallback...`);
      }
    }

    // Fallback to SMTP
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Transition Successful',
        html,
      });
      this.logger.log('Transition success email sent via SMTP fallback');
      return { success: true };
    } catch (error) {
      this.logger.error('All email services failed for transition success email');
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

  async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    // Try Resend first (faster, more reliable on cloud)
    if (this.resendFallback.isAvailable()) {
      try {
        const result = await this.resendFallback.sendEmail({
          to,
          subject,
          html,
        });

        if (result.success) {
          this.logger.log(`Email sent to ${to} via Resend API`);
          return { success: true, messageId: (result as any).data?.id };
        }
      } catch (error) {
        this.logger.warn(`Resend failed: ${error.message}. Trying SMTP fallback...`);
      }
    }

    // Fallback to SMTP
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), 45000),
      );

      const sendPromise = this.mailerService.sendMail({
        to,
        subject,
        html,
      });

      await Promise.race([sendPromise, timeoutPromise]);

      this.logger.log(`Email sent to ${to} via SMTP`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return { success: false };
    }
  }

  async sendPasswordChangeReminderEmail({
    name,
    email,
    createdDate,
  }): Promise<{ success: boolean }> {
    const html = PASSWORD_CHANGE_REMINDER_TEMPLATE.replace('[Name]', name)
      .replace('[Email]', email)
      .replace('[CreatedDate]', createdDate);

    // Try Resend first
    if (this.resendFallback.isAvailable()) {
      try {
        const result = await this.resendFallback.sendEmail({
          to: email,
          subject: 'Reminder: Please Change Your Temporary Password',
          html,
        });

        if (result.success) {
          this.logger.log('Password change reminder email sent via Resend API');
          return { success: true };
        }
      } catch (error) {
        this.logger.warn(`Resend failed: ${error.message}. Trying SMTP fallback...`);
      }
    }

    // Fallback to SMTP
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reminder: Please Change Your Temporary Password',
        html,
      });
      this.logger.log('Password change reminder email sent via SMTP fallback');
      return { success: true };
    } catch (error) {
      this.logger.error('All email services failed for password change reminder email');
      return { success: false };
    }
  }
}
