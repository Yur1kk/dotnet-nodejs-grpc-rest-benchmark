import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:5005',
      package: 'orders',
      protoPath: join(process.cwd(), 'proto/orders.proto'),
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
    },
  });

  await app.listen();
  console.log('[orders-service-rpc] gRPC server listening on 0.0.0.0:5005');
}
bootstrap();
