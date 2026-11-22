import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateCountdownDto, CreateMilestoneDto, CreateReminderDto, SyncRequestDto, UpdateCountdownDto, UpdateMilestoneDto, UpdateReminderDto } from './dtos';
import { ResourcesService } from './resources.service';

type UserRequest = Request & { userId: string };
@ApiTags('resources')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}
  @Get('auth/profile') profile(@Req() req: UserRequest) { return this.resources.profile(req.userId); }
  @Get('countdowns') listCountdowns(@Req() req: UserRequest) { return this.resources.listCountdowns(req.userId); }
  @Post('countdowns') createCountdown(@Req() req: UserRequest, @Body() dto: CreateCountdownDto, @Headers('idempotency-key') key?: string) { return this.resources.createCountdown(req.userId, dto, key); }
  @Patch('countdowns/:id') updateCountdown(@Req() req: UserRequest, @Param('id') id: string, @Body() dto: UpdateCountdownDto, @Headers('if-match') version?: string) { return this.resources.updateCountdown(req.userId, id, dto, version); }
  @Delete('countdowns/:id') deleteCountdown(@Req() req: UserRequest, @Param('id') id: string) { return this.resources.deleteCountdown(req.userId, id); }
  @Get('milestones') listMilestones(@Req() req: UserRequest) { return this.resources.listMilestones(req.userId); }
  @Post('milestones') createMilestone(@Req() req: UserRequest, @Body() dto: CreateMilestoneDto) { return this.resources.createMilestone(req.userId, dto); }
  @Patch('milestones/:id') updateMilestone(@Req() req: UserRequest, @Param('id') id: string, @Body() dto: UpdateMilestoneDto) { return this.resources.updateMilestone(req.userId, id, dto); }
  @Delete('milestones/:id') deleteMilestone(@Req() req: UserRequest, @Param('id') id: string) { return this.resources.deleteMilestone(req.userId, id); }
  @Get('reminders') listReminders(@Req() req: UserRequest) { return this.resources.listReminders(req.userId); }
  @Post('reminders') createReminder(@Req() req: UserRequest, @Body() dto: CreateReminderDto) { return this.resources.createReminder(req.userId, dto); }
  @Patch('reminders/:id') updateReminder(@Req() req: UserRequest, @Param('id') id: string, @Body() dto: UpdateReminderDto) { return this.resources.updateReminder(req.userId, id, dto); }
  @Delete('reminders/:id') deleteReminder(@Req() req: UserRequest, @Param('id') id: string) { return this.resources.deleteReminder(req.userId, id); }
  @Get('sync/:entity/:id') getSyncRecord(@Req() req: UserRequest, @Param('entity') entity: string, @Param('id') id: string) { return this.resources.getSyncRecord(req.userId, entity, id); }
  @Post('sync') sync(@Req() req: UserRequest, @Body() dto: SyncRequestDto, @Headers('idempotency-key') key?: string) { return this.resources.sync(req.userId, dto, key); }
}