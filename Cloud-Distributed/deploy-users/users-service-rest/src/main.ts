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

  const config = new DocumentBuilder()
    .setTitle('Users Service (REST)')
    .setDescription(
      'Internal REST microservice for user management.\n\n' +
      'Called by `rest-api-gateway` via HTTP REST.\n\n' +
      '**File operations:**\n' +
      '- `GET /users/export` → returns all users as CSV (text/csv)\n' +
      '- `POST /users/import` → accepts multipart CSV, bulk-inserts users',
    )
    .setVersion('1.0')
    .addTag('users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = parseInt(process.env.PORT ?? '3002', 10);
  await app.listen(port);
  console.log(`[users-service-rest] Running on http://localhost:${port}`);
  console.log(`[users-service-rest] Swagger: http://localhost:${port}/docs`);
}
bootstrap();
