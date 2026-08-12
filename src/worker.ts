import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RabbitMqService } from './queue/rabbitmq.service';
import { ChatOutboxProcessor } from './chats/chat-outbox.processor';
import { NotificationDispatcherService } from './notifications/notification-dispatcher.service';
import { BulkEmailService } from './admin/bulk-email.service';
import { EmailService } from './email/email.service';

async function bootstrapWorker() {
  process.env.PROCESS_ROLE = 'worker';
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  const rabbit = app.get(RabbitMqService);
  const chat = app.get(ChatOutboxProcessor);
  const notifications = app.get(NotificationDispatcherService);
  const bulkEmail = app.get(BulkEmailService);
  const email = app.get(EmailService);

  const consume = () => rabbit.consume(async (job) => {
    switch (job.type) {
      case 'chat-outbox':
        await chat.processPendingMessages();
        break;
      case 'notification-outbox':
        if (job.resourceId) await notifications.deliver(job.resourceId);
        else await notifications.processPending();
        break;
      case 'bulk-email':
        if (job.resourceId) await bulkEmail.processEmailLog(job.resourceId);
        else await bulkEmail.processPendingEmails();
        break;
      case 'email':
        await email.deliverQueuedEmail(job.payload || {});
        break;
      default:
        throw new Error(`Unsupported queue job: ${(job as any).type}`);
    }
  });

  const consuming = await consume();
  if (!consuming) logger.warn('RabbitMQ unavailable; MongoDB outbox sweepers remain active');
  if (!consuming && rabbit.isConfigured()) {
    const retry = setInterval(async () => {
      if (await consume()) clearInterval(retry);
    }, 30_000);
    retry.unref();
  }
  setInterval(() => void bulkEmail.processPendingEmails(), 30_000).unref();
  logger.log('CMDA background worker started');
}

void bootstrapWorker();
