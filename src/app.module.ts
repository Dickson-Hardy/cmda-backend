import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { ResourcesModule } from './resources/resources.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { DevotionalsModule } from './devotionals/devotionals.module';
import { FaithEntryModule } from './faithentry/faithentry.module';
import { VacancyModule } from './vacancy/vacancy.module';
import { VolunteersModule } from './volunteers/volunteers.module';
import { EmailModule } from './email/email.module';
import { ChatsModule } from './chats/chats.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DonationsModule } from './donations/donations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaystackModule } from './paystack/paystack.module';
import { OrdersModule } from './orders/orders.module';
import { TrainingModule } from './training/training.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaypalModule } from './paypal/paypal.module';
import { PaymentIntentsModule } from './payment-intents/payment-intents.module';
import { MemberManagerModule } from './member-manager/member-manager.module';
import { BackupModule } from './backup/backup.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledEmailsModule } from './scheduled-emails/scheduled-emails.module';
import { ProjectDeliverablesModule } from './project-deliverables/project-deliverables.module';
import { DevelopmentInvoicesModule } from './development-invoices/development-invoices.module';
import { ServiceSubscriptionsModule } from './service-subscriptions/service-subscriptions.module';
import { ChaptersModule } from './chapters/chapters.module';
import { CommentsReactionsModule } from './comments-reactions/comments-reactions.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    EventsModule,
    ResourcesModule,
    ProductsModule,
    DevotionalsModule,
    FaithEntryModule,
    VolunteersModule,
    EmailModule,
    ChatsModule,
    CloudinaryModule,
    DonationsModule,
    SubscriptionsModule,
    PaystackModule,
    OrdersModule,
    AdminModule,
    TrainingModule,
    NotificationsModule,
    PaypalModule,
    PaymentIntentsModule,
    MemberManagerModule,
    BackupModule,
    ScheduledEmailsModule,
    DevelopmentInvoicesModule,
    ProjectDeliverablesModule,
    ServiceSubscriptionsModule,
    ChaptersModule,
    CommentsReactionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
