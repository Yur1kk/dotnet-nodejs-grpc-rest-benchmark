import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { OrdersModule } from './orders/orders.module';

export const USERS_GRPC_CLIENT = 'USERS_GRPC_CLIENT';

@Module({
  imports: [
    OrdersModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
