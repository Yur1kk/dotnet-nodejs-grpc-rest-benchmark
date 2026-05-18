import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

export const USERS_GRPC = 'USERS_GRPC';
export const ORDERS_GRPC = 'ORDERS_GRPC';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
    UsersModule,
    OrdersModule,
  ],
})
export class AppModule {}
