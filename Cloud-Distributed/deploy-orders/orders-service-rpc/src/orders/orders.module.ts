import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../database/prisma.service';
import { USERS_GRPC_CLIENT } from '../grpc.constants';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: USERS_GRPC_CLIENT,
        transport: Transport.GRPC,
        options: {
          url: process.env.USERS_SERVICE_GRPC_URL || 'localhost:5003',
          package: 'users',
          protoPath: join(process.cwd(), 'proto/users.proto'),
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
})
export class OrdersModule {}
