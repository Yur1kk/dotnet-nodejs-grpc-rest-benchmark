import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 5000, maxRedirects: 3 }),
    // Configure multer to store uploaded files in memory (Buffer)
    // This allows reading the CSV file content without saving to disk
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    }),
    UsersModule,
    OrdersModule,
  ],
})
export class AppModule {}
