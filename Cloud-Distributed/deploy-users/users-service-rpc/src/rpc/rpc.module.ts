import { Module } from '@nestjs/common';
import { RpcController } from './rpc.controller';
import { RpcService } from './rpc.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [RpcController],
  providers: [RpcService],
})
export class RpcModule {}
