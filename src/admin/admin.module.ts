import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PendingPaymentsController } from './pending-payments.controller';
import { PendingPaymentsService } from './pending-payments.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './admin.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailModule } from '../email/email.module';
import { PaystackModule } from '../paystack/paystack.module';
import { BulkEmailService } from './bulk-email.service';
import { EmailLog, EmailLogSchema } from '../email/email-log.schema';
import { User, UserSchema } from '../users/schema/users.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: config.get<string | number>('JWT_EXPIRE'),
          },
        };
      },
    }),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmailModule,
    PaystackModule,
  ],
  controllers: [AdminController, PendingPaymentsController],
  providers: [AdminService, PendingPaymentsService, BulkEmailService],
})
export class AdminModule {}
