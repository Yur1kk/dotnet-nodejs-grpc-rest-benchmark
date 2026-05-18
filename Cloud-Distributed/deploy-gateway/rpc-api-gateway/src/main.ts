import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('RPC API Gateway')
    .setDescription(
      'API Gateway — exposes **REST API** to clients, communicates with microservices via **JSON-RPC 2.0** internally.\n\n' +
      '**File operations (key design difference vs REST):**\n' +
      '- `GET /api/users/export` → calls JSON-RPC `exportUsers` → gateway converts JSON → CSV\n' +
      '- `POST /api/users/import` → gateway parses CSV → calls JSON-RPC `createUser` per row\n\n' +
      'Compare with REST Gateway: REST gateway streams binary directly; RPC gateway must parse/convert.',
    )
    .setVersion('1.0')
    .addTag('users', 'User management (internally via JSON-RPC 2.0)')
    .addTag('orders', 'Order management (internally via JSON-RPC 2.0)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`[rpc-api-gateway] Running on http://localhost:${port}`);
  console.log(`[rpc-api-gateway] Swagger UI: http://localhost:${port}/docs`);
  console.log(`[rpc-api-gateway] Internal protocol: JSON-RPC 2.0`);
}
bootstrap();
