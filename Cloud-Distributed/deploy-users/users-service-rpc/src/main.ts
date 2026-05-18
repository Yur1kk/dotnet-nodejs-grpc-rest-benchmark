import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // gRPC microservice on port 5003
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:5003',
      package: 'users',
      protoPath: join(process.cwd(), 'proto/users.proto'),
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
      channelOptions: {
        'grpc.keepalive_time_ms': 20000,
        'grpc.keepalive_timeout_ms': 10000,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_concurrent_streams': 1000,
      },
      onClientBind: () => {
        console.log('[users-service-rpc] Client bound');
      },
    },
  });

  await app.listen();
  console.log('[users-service-rpc] gRPC server listening on 0.0.0.0:5003');
}
bootstrap();
