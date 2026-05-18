import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ORDERS_GRPC } from '../grpc.constants';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: ORDERS_GRPC,
        transport: Transport.GRPC,
        options: {
          url: process.env.ORDERS_SERVICE_GRPC_URL || 'localhost:5005',
          package: 'orders',
          protoPath: join(process.cwd(), 'proto/orders.proto'),
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
