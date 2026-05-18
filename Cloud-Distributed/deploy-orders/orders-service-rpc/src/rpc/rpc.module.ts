import { Module } from '@nestjs/common';
import { RpcController } from './rpc.controller';
import { RpcService } from './rpc.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [RpcController],
  providers: [RpcService],
})
export class RpcModule {}
