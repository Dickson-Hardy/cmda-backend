import { InjectModel } from '@nestjs/mongoose';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message } from './schema/message.schema';
import { Connection, Model } from 'mongoose';
import { ChatLog } from './schema/chat-log.schema';
import { User } from '../users/schema/users.schema';
import { AuthService } from '../auth/auth.service';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AllAdminRoles, AdminRole } from '../admin/admin.constant';
import { SOCKET_IO_CORS } from '../_global/constants/cors.constants';
import { BroadcastMessageDto } from './dto/broadcast-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ValidationPipe } from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatBlock } from './schema/chat-block.schema';
import { ChatOutbox } from './schema/chat-outbox.schema';
import { InjectConnection } from '@nestjs/mongoose';

type AuthenticatedSocket = Socket & {
  data: { user?: IJwtPayload; accessToken?: string; expirationTimer?: NodeJS.Timeout };
};

@WebSocketGateway({ cors: SOCKET_IO_CORS })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly messageRateLimits = new Map<string, number[]>();

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(ChatBlock.name) private readonly chatBlockModel: Model<ChatBlock>,
    @InjectModel(ChatOutbox.name) private readonly outboxModel: Model<ChatOutbox>,
    @InjectConnection() private readonly connection: Connection,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token = this.extractSocketToken(client);

    try {
      if (!token) throw new Error('Missing token');
      const user = await this.authService.validateToken(token);
      client.data.user = user;
      client.data.accessToken = token;
      await client.join(this.userRoom(this.chatIdentity(user)));
      const expiresIn = Math.max(0, user.exp * 1000 - Date.now());
      client.data.expirationTimer = setTimeout(() => {
        client.emit('auth_error', { message: 'Session expired' });
        client.disconnect(true);
      }, Math.min(expiresIn, 2_147_000_000));
      client.once('disconnect', () => clearTimeout(client.data.expirationTimer));
    } catch {
      client.emit('auth_error', { message: 'Authentication required' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('newMessage')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    data: SendMessageDto,
  ) {
    const user = await this.requireSocketUser(client);
    this.assertRateLimit(`message:${user.id}`, 20);
    try {
      return await this.sendMessage({
        sender: this.chatIdentity(user),
        receiver: data.receiver.trim(),
        content: data.content.trim(),
        clientMessageId: data.clientMessageId,
      });
    } catch (error) {
      throw new WsException(error?.message || 'Unable to send message');
    }
  }

  async sendMessage(data: {
    sender: string;
    receiver: string;
    content: string;
    clientMessageId?: string;
  }) {
    const { sender, receiver, content, clientMessageId } = data;

    if (receiver !== 'admin') {
      const recipientExists = await this.userModel.exists({
        _id: receiver,
        isActive: true,
        isBanned: { $ne: true },
      });
      if (!recipientExists) throw new NotFoundException('Recipient is unavailable');
    }

    if (sender !== 'admin' && receiver !== 'admin') {
      const blocked = await this.chatBlockModel.exists({
        $or: [
          { blocker: sender, blocked: receiver },
          { blocker: receiver, blocked: sender },
        ],
      });
      if (blocked) throw new ForbiddenException('Messaging is unavailable for this conversation');
    }

    if (clientMessageId) {
      const existingMessage = await this.messageModel.findOne({ sender, clientMessageId });
      if (existingMessage) return existingMessage;
    }

    let newMessage: Message;
    try {
      await this.connection.transaction(async (session) => {
        [newMessage] = await this.messageModel.create(
          [{ sender, receiver, content, clientMessageId }],
          { session },
        );

        await Promise.all([
          this.chatLogModel.findOneAndUpdate(
            { user: sender, chatWith: receiver },
            { lastMessage: content },
            { upsert: true, new: true, session },
          ),
          this.chatLogModel.findOneAndUpdate(
            { user: receiver, chatWith: sender },
            { lastMessage: content },
            { upsert: true, new: true, session },
          ),
        ]);

        if (receiver !== 'admin') {
          await this.outboxModel.create(
            [{ message: newMessage._id, receiver, status: 'pending', nextAttemptAt: new Date() }],
            { session },
          );
        }
      });
    } catch (error) {
      if (error?.code === 11000 && clientMessageId) {
        return this.messageModel.findOne({ sender, clientMessageId });
      }
      throw error;
    }

    this.emitToConversation(sender, receiver, newMessage);

    return newMessage;
  }

  //  admin sending broadcast message to selected users
  @SubscribeMessage('broadcastMessage')
  async handleBroadcast(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    data: BroadcastMessageDto,
  ) {
    const user = await this.requireSocketUser(client);
    if (!AllAdminRoles.includes(user.role as AdminRole)) {
      throw new WsException('Admin role required');
    }
    this.assertRateLimit(`broadcast:${user.id}`, 5);

    return this.broadcastMessage(data);
  }

  async broadcastMessage(data: BroadcastMessageDto) {

    const sender = 'admin';
    const { receiverCriteria, content } = data;
    const { role, region, searchBy } = receiverCriteria;

    const searchCriteria: any = { isActive: true, isBanned: { $ne: true } };
    if (searchBy) {
      const escapedSearch = searchBy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchCriteria.$or = [
        { firstName: new RegExp(escapedSearch, 'i') },
        { middleName: new RegExp(escapedSearch, 'i') },
        { lastName: new RegExp(escapedSearch, 'i') },
        { email: new RegExp(escapedSearch, 'i') },
        { specialty: new RegExp(escapedSearch, 'i') },
        { licenseNumber: new RegExp(escapedSearch, 'i') },
        { membershipId: new RegExp(escapedSearch, 'i') },
      ];
    }
    if (role) searchCriteria.role = role;
    if (region) searchCriteria.region = region;

    const receivers = await this.userModel.find(searchCriteria).lean();
    const BATCH_SIZE = 50;

    // Process receivers in batches to avoid overwhelming the database
    let delivered = 0;
    for (let i = 0; i < receivers.length; i += BATCH_SIZE) {
      const batch = receivers.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (receiver) => {
          try {
            await this.sendMessage({
              sender,
              receiver: receiver._id.toString(),
              content,
            });
            delivered += 1;
          } catch (error) {
            console.error(`Failed to send broadcast message to ${receiver._id}:`, error.message);
          }
        }),
      );
    }

    return { matched: receivers.length, delivered };
  }

  private extractSocketToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken) return authToken;

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization !== 'string') return undefined;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private async requireSocketUser(client: AuthenticatedSocket): Promise<IJwtPayload> {
    if (!client.data.user || !client.data.accessToken) {
      throw new WsException('Authentication required');
    }
    try {
      const user = await this.authService.validateToken(client.data.accessToken);
      client.data.user = user;
      return user;
    } catch {
      client.emit('auth_error', { message: 'Session expired or revoked' });
      client.disconnect(true);
      throw new WsException('Authentication required');
    }
  }

  private chatIdentity(user: IJwtPayload): string {
    return AllAdminRoles.includes(user.role as AdminRole) ? 'admin' : user.id;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private emitToConversation(sender: string, receiver: string, message: Message) {
    let target = this.server.to(this.userRoom(sender));
    if (receiver !== sender) target = target.to(this.userRoom(receiver));
    target.emit(`newMessage_${[sender, receiver].sort().join('_')}`, message);
  }

  private assertRateLimit(key: string, limit: number) {
    const now = Date.now();
    const windowStart = now - 60_000;
    const attempts = (this.messageRateLimits.get(key) || []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (attempts.length >= limit) throw new WsException('Too many requests');
    attempts.push(now);
    this.messageRateLimits.set(key, attempts);
  }
}
