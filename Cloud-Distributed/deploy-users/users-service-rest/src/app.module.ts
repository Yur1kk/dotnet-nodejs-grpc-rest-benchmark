import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from './database/prisma.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UsersModule,
    HttpModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  providers: [PrismaService],
})
export class AppModule {}
