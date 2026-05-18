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
    .setTitle('REST API Gateway')
    .setDescription(
      'API Gateway — exposes REST API, communicates with microservices via **HTTP REST** internally.\n\n' +
      '**File operations:**\n' +
      '- `GET /api/users/export` → proxies HTTP GET to users-service-rest → streams CSV\n' +
      '- `POST /api/users/import` → proxies multipart/form-data to users-service-rest directly',
    )
    .setVersion('1.0')
    .addTag('users', 'User management (internally via HTTP REST)')
    .addTag('orders', 'Order management (internally via HTTP REST)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  console.log(`[rest-api-gateway] Running on http://localhost:${port}`);
  console.log(`[rest-api-gateway] Swagger UI: http://localhost:${port}/docs`);
  console.log(`[rest-api-gateway] Internal protocol: HTTP REST`);
}
bootstrap();
