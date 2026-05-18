import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { USERS_GRPC } from '../grpc.constants';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: USERS_GRPC,
        transport: Transport.GRPC,
        options: {
          url: process.env.USERS_SERVICE_GRPC_URL || 'localhost:5003',
          package: 'users',
          protoPath: join(process.cwd(), 'proto/users.proto'),
        },
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
