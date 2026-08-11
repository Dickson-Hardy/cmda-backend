import { EmailService } from './email.service';

describe('EmailService Global Network onboarding', () => {
  const mailerService = {
    sendMail: jest.fn().mockResolvedValue({ accepted: ['ada@example.com'] }),
  } as any;
  const resendFallback = {
    isAvailable: jest.fn(() => true),
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
  } as any;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'PUBLIC_API_URL') return 'https://api.example.com';
      if (key === 'ONBOARDING_EMAIL_PROVIDER') return 'smtp';
      return undefined;
    }),
  } as any;
  const service = new EmailService(mailerService, resendFallback, configService);

  beforeEach(() => {
    jest.clearAllMocks();
    resendFallback.isAvailable.mockReturnValue(true);
    resendFallback.sendEmail.mockResolvedValue({ success: true });
    mailerService.sendMail.mockResolvedValue({ accepted: ['ada@example.com'] });
  });

  it('sends role-specific credentials with an email-safe logo treatment', async () => {
    await service.sendMemberCredentialsEmail({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'temporary-password',
      userId: 'member-1',
      role: 'GlobalNetwork',
    });

    const message = mailerService.sendMail.mock.calls[0][0];
    expect(message.subject).toContain('CMDA Global Network');
    expect(message.html).toContain('onboard you into the CMDA Global Network');
    expect(message.html).toContain('CMDALOGO_white.png');
    expect(message.html).toContain('background-color: #ffffff');
    expect(message.html).not.toContain('[AccountHeading]');
    expect(resendFallback.sendEmail).not.toHaveBeenCalled();
  });

  it('identifies Global Network onboarding during self-registration', async () => {
    await service.sendWelcomeEmail({
      name: 'Ada',
      email: 'ada@example.com',
      code: '123456',
      role: 'GlobalNetwork',
    });

    const message = mailerService.sendMail.mock.calls[0][0];
    expect(message.subject).toContain('Complete Your Onboarding');
    expect(message.html).toContain('Welcome to the CMDA Global Network');
    expect(message.html).toContain('123456');
    expect(message.html).not.toContain('[WelcomeIntro]');
    expect(resendFallback.sendEmail).not.toHaveBeenCalled();
  });

  it('can restore Resend routing through configuration', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'ONBOARDING_EMAIL_PROVIDER') return 'resend';
      return 'https://api.example.com';
    });

    await service.sendWelcomeEmail({
      name: 'Ada',
      email: 'ada@example.com',
      code: '123456',
      role: 'GlobalNetwork',
    });

    expect(resendFallback.sendEmail).toHaveBeenCalledTimes(1);
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });
});
