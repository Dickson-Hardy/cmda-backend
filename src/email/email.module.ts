import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('EMAIL_HOST'),
          secure: true,
          port: 465,
          auth: {
            user: config.get<string>('EMAIL_USER'),
            pass: config.get<string>('EMAIL_PASS'),
          },
          connectionTimeout: 10000, // 10 seconds
          greetingTimeout: 5000,
          socketTimeout: 15000,
          pool: true, // Use connection pooling
          maxConnections: 5,
          maxMessages: 100,
          // logger: true, // Enable logging
          // debug: true, // Enable debug output
        },
        defaults: {
          from: config.get<string>('EMAIL_FROM'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
