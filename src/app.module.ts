import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { ResourcesModule } from './resources/resources.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { NuggetsModule } from './nuggets/nuggets.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    EventsModule,
    ResourcesModule,
    AdminModule,
    ProductsModule,
    NuggetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
