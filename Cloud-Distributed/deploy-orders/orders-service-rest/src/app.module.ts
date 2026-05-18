import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from './database/prisma.service';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [OrdersModule, HttpModule],
  providers: [PrismaService],
})
export class AppModule {}
