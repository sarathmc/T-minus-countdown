import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    const required = ['DATABASE_URL', 'SUPABASE_URL', 'FRONTEND_ORIGINS'];
    const missing = required.filter((name) => !process.env[name]?.trim());
    if (missing.length || process.env['FRONTEND_ORIGINS']?.includes('*')) {
      throw new Error(`Invalid production configuration${missing.length ? `; missing ${missing.join(', ')}` : '; wildcard CORS is not allowed'}.`);
    }
  }
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();
  app.use(json({ limit: process.env['JSON_BODY_LIMIT'] ?? '256kb' }));
  const origins = (process.env['FRONTEND_ORIGINS'] ?? 'http://localhost:4200').split(',').map((item) => item.trim());
  app.enableCors({ origin: origins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type', 'If-Match', 'Idempotency-Key'] });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const swagger = new DocumentBuilder().setTitle('T-Minus API').setDescription('User-scoped local-first synchronization API').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  await app.listen(Number(process.env['PORT'] ?? 3000), '0.0.0.0');
}
void bootstrap();