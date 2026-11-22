import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { PushSubscriptionDto } from '../resources/dtos';
import { PushService } from './push.service';

type UserRequest = Request & { userId: string };

@ApiTags('push')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('push/subscriptions')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post()
  register(@Req() req: UserRequest, @Body() dto: PushSubscriptionDto) { return this.push.register(req.userId, dto); }
  @Get()
  list(@Req() req: UserRequest) { return this.push.list(req.userId); }
  @Delete(':id')
  remove(@Req() req: UserRequest, @Param('id') id: string) { return this.push.remove(req.userId, id); }
}
