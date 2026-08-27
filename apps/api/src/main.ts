import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('AESCION-API-BOOTSTRAP');

  // Configure body parser limits for base64 uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  });

  // Global Prefix
  const globalPrefix = process.env.API_PREFIX || '/api/v1';
  app.setGlobalPrefix(globalPrefix.replace(/^\//, ''));

  // Global validation and exception handling
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('AESCION Commerce Enterprise API')
    .setDescription('Production Multi-Tenant Business Operating System & POS Engine')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(`AESCION Commerce Backend Engine is LIVE on port ${port}`);
  logger.log(`API Base: http://localhost:${port}${globalPrefix}`);
  logger.log(`Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`WebSocket Server active on port ${port}`);
  logger.log(`=======================================================`);
}
bootstrap();
