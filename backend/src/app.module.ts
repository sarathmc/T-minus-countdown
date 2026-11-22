import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './database/prisma.service';
import { AuthGuard } from './auth/auth.guard';
import { HealthController } from './health/health.controller';
import { ResourcesController } from './resources/resources.controller';
import { ResourcesService } from './resources/resources.service';
import { PushController } from './push/push.controller';
import { PushService } from './push/push.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
  controllers: [HealthController, ResourcesController, PushController],
  providers: [PrismaService, ResourcesService, PushService, AuthGuard, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}