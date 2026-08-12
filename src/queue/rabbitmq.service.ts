import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import {
  DEAD_LETTER_EXCHANGE,
  DEAD_LETTER_QUEUE,
  JOB_QUEUE,
  JobType,
  QueueJob,
  REALTIME_EXCHANGE,
  RealtimeEvent,
} from './queue.constants';

@Injectable()
export class RabbitMqService implements OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private connecting?: Promise<Channel | null>;
  private realtimeHandler?: (event: RealtimeEvent) => Promise<void>;
  private jobHandler?: (job: QueueJob) => Promise<void>;
  private shuttingDown = false;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('RABBITMQ_URL'));
  }

  async publish(
    type: JobType,
    resourceId?: string,
    payload?: Record<string, unknown>,
  ): Promise<boolean> {
    const channel = await this.getChannel();
    if (!channel) return false;
    const job: QueueJob = { type, resourceId, payload, createdAt: new Date().toISOString() };
    const accepted = channel.sendToQueue(JOB_QUEUE, Buffer.from(JSON.stringify(job)), {
      persistent: true,
      contentType: 'application/json',
      messageId: resourceId ? `${type}:${resourceId}` : undefined,
      timestamp: Date.now(),
    });
    if (!accepted) await new Promise<void>((resolve) => channel.once('drain', resolve));
    return true;
  }

  async consume(handler: (job: QueueJob) => Promise<void>): Promise<boolean> {
    this.jobHandler = handler;
    const channel = await this.getChannel();
    if (!channel) return false;
    await channel.prefetch(Number(this.config.get<string>('RABBITMQ_PREFETCH') || 10));
    await channel.consume(JOB_QUEUE, async (message: ConsumeMessage | null) => {
      if (!message) return;
      try {
        const job = JSON.parse(message.content.toString()) as QueueJob;
        await handler(job);
        channel.ack(message);
      } catch (error) {
        this.logger.error(`RabbitMQ job failed: ${error?.message || error}`);
        channel.nack(message, false, false);
      }
    });
    this.logger.log(`Consuming durable jobs from ${JOB_QUEUE}`);
    return true;
  }

  async publishRealtime(event: RealtimeEvent): Promise<boolean> {
    const channel = await this.getChannel();
    if (!channel) return false;
    const accepted = channel.publish(REALTIME_EXCHANGE, '', Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
    });
    if (!accepted) await new Promise<void>((resolve) => channel.once('drain', resolve));
    return true;
  }

  async consumeRealtime(handler: (event: RealtimeEvent) => Promise<void>): Promise<boolean> {
    this.realtimeHandler = handler;
    const channel = await this.getChannel();
    if (!channel) return false;
    const queue = await channel.assertQueue('', { exclusive: true, autoDelete: true });
    await channel.bindQueue(queue.queue, REALTIME_EXCHANGE, '');
    await channel.consume(queue.queue, async (message) => {
      if (!message) return;
      try {
        await handler(JSON.parse(message.content.toString()) as RealtimeEvent);
        channel.ack(message);
      } catch (error) {
        this.logger.error(`Realtime event failed: ${error?.message || error}`);
        channel.nack(message, false, false);
      }
    });
    return true;
  }

  private async getChannel(): Promise<Channel | null> {
    if (this.channel) return this.channel;
    if (this.connecting) return this.connecting;
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL is not configured; durable jobs remain in MongoDB');
      return null;
    }
    this.connecting = this.connect(url);
    try {
      return await this.connecting;
    } finally {
      this.connecting = undefined;
    }
  }

  private async connect(url: string): Promise<Channel | null> {
    try {
      const connectionUrl = new URL(url);
      if (!connectionUrl.searchParams.has('heartbeat')) {
        connectionUrl.searchParams.set(
          'heartbeat',
          this.config.get<string>('RABBITMQ_HEARTBEAT') || '30',
        );
      }
      this.connection = await amqp.connect(connectionUrl.toString());
      this.connection.on('error', (error) => this.logger.error(`RabbitMQ error: ${error.message}`));
      this.connection.on('close', () => {
        this.channel = undefined;
        this.connection = undefined;
        this.logger.warn('RabbitMQ connection closed');
        if (!this.shuttingDown && this.realtimeHandler) {
          setTimeout(() => void this.consumeRealtime(this.realtimeHandler!), 5_000).unref();
        }
        if (!this.shuttingDown && this.jobHandler) {
          setTimeout(() => void this.consume(this.jobHandler!), 5_000).unref();
        }
      });
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
      await this.channel.assertExchange(REALTIME_EXCHANGE, 'fanout', { durable: true });
      await this.channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
      await this.channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, JOB_QUEUE);
      await this.channel.assertQueue(JOB_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
          'x-dead-letter-routing-key': JOB_QUEUE,
        },
      });
      this.logger.log('RabbitMQ durable queue connected');
      return this.channel;
    } catch (error) {
      this.logger.error(`RabbitMQ connection failed: ${error?.message || error}`);
      this.channel = undefined;
      this.connection = undefined;
      return null;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.shuttingDown = true;
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // Connection may already be closed during platform shutdown.
    }
  }
}
