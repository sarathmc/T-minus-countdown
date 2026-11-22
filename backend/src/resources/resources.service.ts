import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { PushService } from '../push/push.service';
import { CreateCountdownDto, CreateMilestoneDto, CreateReminderDto, SyncChange, SyncRequestDto, UpdateCountdownDto, UpdateMilestoneDto, UpdateReminderDto } from './dtos';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService, private readonly push?: PushService) {}

  private async owned<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
      return operation(tx);
    });
  }

  profile(userId: string) { return this.owned(userId, async (tx) => tx.userProfile.findUniqueOrThrow({ where: { id: userId }, select: { id: true, createdAt: true } })); }
  listCountdowns(userId: string) { return this.owned(userId, (tx) => tx.countdown.findMany({ where: { userId }, include: { milestones: true }, orderBy: { targetDate: 'asc' } })); }
  async createCountdown(userId: string, dto: CreateCountdownDto, idempotencyKey?: string) {
    return this.owned(userId, async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.countdown.findFirst({ where: { userId, id: dto.id } });
        if (existing) return existing;
      }
      const now = new Date();
      return tx.countdown.create({ data: { ...dto, userId, targetDate: new Date(dto.targetDate), createdAt: now, updatedAt: now, revision: 1 } });
    });
  }
  async updateCountdown(userId: string, id: string, dto: UpdateCountdownDto, ifMatch?: string) {
    const result = await this.owned(userId, async (tx) => {
      const current = await tx.countdown.findFirst({ where: { id, userId } });
      if (!current) throw new NotFoundException();
      if (ifMatch && current.updatedAt.toISOString() !== ifMatch.replaceAll('"', '')) throw new ConflictException({ code: 'VERSION_CONFLICT', current });
      return tx.countdown.update({ where: { id }, data: { ...dto, targetDate: new Date(dto.targetDate), updatedAt: new Date(), revision: { increment: 1 } } });
    });
    await this.push?.cancelCountdown(userId, id);
    return result;
  }
  async deleteCountdown(userId: string, id: string) {
    await this.push?.cancelCountdown(userId, id);
    return this.owned(userId, async (tx) => {
    const row = await tx.countdown.findFirst({ where: { id, userId } }); if (!row) throw new NotFoundException();
    await tx.deletedRecord.upsert({ where: { userId_entity_recordId: { userId, entity: 'countdown', recordId: id } }, create: { userId, entity: 'countdown', recordId: id }, update: { deletedAt: new Date() } });
    await tx.countdown.delete({ where: { id } }); return { deleted: true };
    });
  }

  listMilestones(userId: string) { return this.owned(userId, (tx) => tx.milestone.findMany({ where: { userId }, orderBy: { date: 'asc' } })); }
  createMilestone(userId: string, dto: CreateMilestoneDto) { return this.owned(userId, async (tx) => {
    await this.requireCountdown(tx, userId, dto.countdownId);
    return tx.milestone.create({ data: { ...dto, userId, date: new Date(dto.date) } });
  }); }
  updateMilestone(userId: string, id: string, dto: UpdateMilestoneDto) { return this.owned(userId, async (tx) => {
    const row = await tx.milestone.findFirst({ where: { id, userId } }); if (!row) throw new NotFoundException();
    return tx.milestone.update({ where: { id }, data: { ...dto, date: new Date(dto.date), updatedAt: new Date(), revision: { increment: 1 } } });
  }); }
  deleteMilestone(userId: string, id: string) { return this.owned(userId, async (tx) => {
    const row = await tx.milestone.findFirst({ where: { id, userId } }); if (!row) throw new NotFoundException();
    await tx.deletedRecord.upsert({ where: { userId_entity_recordId: { userId, entity: 'milestone', recordId: id } }, create: { userId, entity: 'milestone', recordId: id }, update: { deletedAt: new Date() } });
    await tx.milestone.delete({ where: { id } }); return { deleted: true };
  }); }

  listReminders(userId: string) { return this.owned(userId, (tx) => tx.reminder.findMany({ where: { userId }, orderBy: { scheduledAt: 'asc' } })); }
  async createReminder(userId: string, dto: CreateReminderDto) {
    const reminder = await this.owned(userId, async (tx) => {
    await this.requireCountdown(tx, userId, dto.countdownId);
    if (dto.milestoneId && !await tx.milestone.findFirst({ where: { id: dto.milestoneId, userId, countdownId: dto.countdownId } })) throw new NotFoundException('Milestone not found for this countdown.');
    return tx.reminder.create({ data: { ...dto, description: dto.description ?? '', userId, scheduledAt: new Date(dto.scheduledAt) } });
    });
    await this.push?.scheduleReminder(userId, reminder.id);
    return reminder;
  }
  async updateReminder(userId: string, id: string, dto: UpdateReminderDto) {
    const reminder = await this.owned(userId, async (tx) => {
    const row = await tx.reminder.findFirst({ where: { id, userId } }); if (!row) throw new NotFoundException();
    await this.requireCountdown(tx, userId, dto.countdownId);
    return tx.reminder.update({ where: { id }, data: { ...dto, description: dto.description ?? '', userId, scheduledAt: new Date(dto.scheduledAt), updatedAt: new Date(), revision: { increment: 1 } } });
    });
    await this.push?.cancelReminder(userId, id);
    await this.push?.scheduleReminder(userId, reminder.id);
    return reminder;
  }
  async deleteReminder(userId: string, id: string) {
    await this.push?.cancelReminder(userId, id);
    return this.owned(userId, async (tx) => {
    const row = await tx.reminder.findFirst({ where: { id, userId } }); if (!row) throw new NotFoundException();
    await tx.deletedRecord.upsert({ where: { userId_entity_recordId: { userId, entity: 'reminder', recordId: id } }, create: { userId, entity: 'reminder', recordId: id }, update: { deletedAt: new Date() } });
    await tx.reminder.delete({ where: { id } }); return { deleted: true };
    });
  }

  getSyncRecord(userId: string, entity: string, id: string) {
    if (!['countdown', 'milestone', 'reminder'].includes(entity)) throw new BadRequestException('Unsupported synchronization entity.');
    return this.owned(userId, async (tx) => {
      const record = entity === 'countdown' ? await tx.countdown.findFirst({ where: { id, userId }, include: { milestones: true } }) :
        entity === 'milestone' ? await tx.milestone.findFirst({ where: { id, userId } }) :
          await tx.reminder.findFirst({ where: { id, userId } });
      if (record) return { entity, id, deleted: false, record };
      const tombstone = await tx.deletedRecord.findFirst({ where: { userId, entity, recordId: id } });
      if (tombstone) return { entity, id, deleted: true, tombstone };
      throw new NotFoundException('Synchronization record not found.');
    });
  }

  async sync(userId: string, request: SyncRequestDto, idempotencyKey?: string) {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 128) throw new BadRequestException('A valid Idempotency-Key header is required.');
    const changes = request.changes ?? [];
    const requestHash = createHash('sha256').update(JSON.stringify({ changes, lastSyncedAt: request.lastSyncedAt ?? null })).digest('hex');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
      const previous = await tx.syncRequest.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } } });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED' });
        return previous.response;
      }
      const results: Array<Record<string, unknown>> = [];
      for (const change of changes) {
        if (JSON.stringify(change).length > 256 * 1024) throw new BadRequestException('A synchronization operation is too large.');
        const existing = change.entity === 'countdown' ? await tx.countdown.findFirst({ where: { id: change.id, userId } }) :
          change.entity === 'milestone' ? await tx.milestone.findFirst({ where: { id: change.id, userId } }) :
            await tx.reminder.findFirst({ where: { id: change.id, userId } });
        const tombstone = await tx.deletedRecord.findFirst({ where: { userId, entity: change.entity, recordId: change.id } });
        if (change.operation === 'upsert' && tombstone && !change.allowRestore) {
          results.push({ id: change.id, entity: change.entity, status: 'conflict', code: 'RECORD_DELETED', tombstone });
          continue;
        }
        if (change.operation === 'upsert' && tombstone && change.allowRestore) {
          await tx.deletedRecord.delete({ where: { userId_entity_recordId: { userId, entity: change.entity, recordId: change.id } } });
        }
        const expectedRevision = change.baseRevision;
        const expectedUpdatedAt = change.baseUpdatedAt ? new Date(change.baseUpdatedAt) : undefined;
        const hasExpectedVersion = expectedRevision !== undefined || expectedUpdatedAt !== undefined;
        if (existing && change.operation === 'upsert' && !hasExpectedVersion) {
          results.push({ id: change.id, entity: change.entity, status: 'conflict', code: 'RECORD_EXISTS', current: existing });
          continue;
        }
        if (existing && hasExpectedVersion && ((expectedRevision !== undefined && existing.revision !== expectedRevision) ||
          (expectedUpdatedAt !== undefined && existing.updatedAt.toISOString() !== expectedUpdatedAt.toISOString()))) {
          results.push({ id: change.id, entity: change.entity, status: 'conflict', code: 'VERSION_CONFLICT', current: existing, revision: existing.revision });
          continue;
        }
        if (!existing && change.operation === 'upsert' && hasExpectedVersion) {
          results.push({ id: change.id, entity: change.entity, status: 'conflict', code: 'RECORD_NOT_FOUND' });
          continue;
        }
        if (existing && change.operation === 'delete' && hasExpectedVersion && ((expectedRevision !== undefined && existing.revision !== expectedRevision) ||
          (expectedUpdatedAt !== undefined && existing.updatedAt.toISOString() !== expectedUpdatedAt.toISOString()))) {
          results.push({ id: change.id, entity: change.entity, status: 'conflict', code: 'VERSION_CONFLICT', current: existing, revision: existing.revision });
          continue;
        }
        if (change.operation === 'delete') {
          if (change.entity === 'countdown') await this.push?.cancelCountdownInTransaction(tx, userId, change.id);
          if (change.entity === 'reminder') await this.push?.cancelReminderInTransaction(tx, userId, change.id);
          await tx.deletedRecord.upsert({ where: { userId_entity_recordId: { userId, entity: change.entity, recordId: change.id } }, create: { userId, entity: change.entity, recordId: change.id }, update: { deletedAt: new Date() } });
          if (change.entity === 'countdown') await tx.countdown.deleteMany({ where: { id: change.id, userId } });
          if (change.entity === 'milestone') await tx.milestone.deleteMany({ where: { id: change.id, userId } });
          if (change.entity === 'reminder') await tx.reminder.deleteMany({ where: { id: change.id, userId } });
          results.push({ id: change.id, entity: change.entity, status: 'deleted', revision: existing?.revision });
          continue;
        }
        const payload = this.validateSyncPayload(change.entity, change.id, change.payload);
        const now = new Date();
        const versionWhere = {
          id: change.id,
          userId,
          ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
          ...(expectedUpdatedAt !== undefined ? { updatedAt: expectedUpdatedAt } : {}),
        };
        if (change.entity === 'countdown') {
          const value = payload as unknown as CreateCountdownDto;
          if (existing) {
            const updated = await tx.countdown.updateMany({ where: versionWhere, data: { title: value.title, description: value.description ?? '', targetDate: new Date(value.targetDate), timeZone: value.timeZone, category: value.category, status: value.status, updatedAt: now, revision: { increment: 1 } } });
            if (updated.count !== 1) throw new ConflictException({ code: 'VERSION_CONFLICT', entity: change.entity, id: change.id });
            await this.push?.cancelCountdownInTransaction(tx, userId, change.id);
          } else await tx.countdown.create({ data: { id: change.id, userId, title: value.title, description: value.description ?? '', targetDate: new Date(value.targetDate), timeZone: value.timeZone, category: value.category, status: value.status, createdAt: now, updatedAt: now, revision: 1 } });
          for (const raw of Array.isArray(payload['milestones']) ? payload['milestones'] as unknown[] : []) {
            if (!raw || typeof raw !== 'object') throw new BadRequestException('Countdown milestone payload is invalid.');
            const milestone = raw as Record<string, unknown>;
            if (milestone['countdownId'] !== change.id || typeof milestone['id'] !== 'string' || typeof milestone['title'] !== 'string' || typeof milestone['date'] !== 'string' || typeof milestone['done'] !== 'boolean' || typeof milestone['isDefault'] !== 'boolean' || typeof milestone['offsetDays'] !== 'number') throw new BadRequestException('Countdown milestone payload is invalid.');
            const milestoneData = { countdownId: change.id, userId, title: milestone['title'], description: typeof milestone['description'] === 'string' ? milestone['description'] : '', date: new Date(milestone['date']), offsetDays: milestone['offsetDays'], done: milestone['done'], isDefault: milestone['isDefault'], updatedAt: now };
            const ownedMilestone = await tx.milestone.findFirst({ where: { id: milestone['id'], userId }, select: { id: true } });
            if (ownedMilestone) {
              await tx.milestone.update({ where: { id: milestone['id'] }, data: { ...milestoneData, revision: { increment: 1 } } });
            } else {
              await tx.milestone.create({ data: { id: milestone['id'], ...milestoneData, createdAt: now, revision: 1 } });
            }
          }
        } else if (change.entity === 'milestone') {
          const value = payload as unknown as CreateMilestoneDto;
          await this.requireCountdown(tx, userId, value.countdownId);
          if (existing) {
            const updated = await tx.milestone.updateMany({ where: versionWhere, data: { countdownId: value.countdownId, title: value.title, description: value.description ?? '', date: new Date(value.date), offsetDays: value.offsetDays, done: value.done, isDefault: value.isDefault, updatedAt: now, revision: { increment: 1 } } });
            if (updated.count !== 1) throw new ConflictException({ code: 'VERSION_CONFLICT', entity: change.entity, id: change.id });
          }
          else await tx.milestone.create({ data: { id: change.id, userId, countdownId: value.countdownId, title: value.title, description: value.description ?? '', date: new Date(value.date), offsetDays: value.offsetDays, done: value.done, isDefault: value.isDefault, createdAt: now, updatedAt: now, revision: 1 } });
        } else {
          const value = payload as unknown as CreateReminderDto;
          await this.requireCountdown(tx, userId, value.countdownId);
          if (value.milestoneId && !await tx.milestone.findFirst({ where: { id: value.milestoneId, userId, countdownId: value.countdownId } })) throw new NotFoundException('Milestone not found for this countdown.');
          if (existing) {
            const updated = await tx.reminder.updateMany({ where: versionWhere, data: { countdownId: value.countdownId, milestoneId: value.milestoneId, title: value.title, description: value.description ?? '', scheduledAt: new Date(value.scheduledAt), timeZone: value.timeZone, type: value.type, enabled: value.enabled, updatedAt: now, revision: { increment: 1 } } });
            if (updated.count !== 1) throw new ConflictException({ code: 'VERSION_CONFLICT', entity: change.entity, id: change.id });
          }
          else await tx.reminder.create({ data: { id: change.id, userId, countdownId: value.countdownId, milestoneId: value.milestoneId, title: value.title, description: value.description ?? '', scheduledAt: new Date(value.scheduledAt), timeZone: value.timeZone, type: value.type, enabled: value.enabled, createdAt: now, updatedAt: now, revision: 1 } });
          await this.push?.queueReminder(tx, userId, change.id);
        }
        const saved = change.entity === 'countdown' ? await tx.countdown.findFirstOrThrow({ where: { id: change.id, userId } }) :
          change.entity === 'milestone' ? await tx.milestone.findFirstOrThrow({ where: { id: change.id, userId } }) :
            await tx.reminder.findFirstOrThrow({ where: { id: change.id, userId } });
        results.push({ id: change.id, entity: change.entity, status: existing ? 'updated' : 'created', record: saved, revision: saved.revision });
      }
      const since = request.lastSyncedAt ? new Date(request.lastSyncedAt) : new Date(0);
      const [countdowns, milestones, reminders, deletions] = await Promise.all([
        tx.countdown.findMany({ where: { userId, updatedAt: { gt: since } }, include: { milestones: true } }),
        tx.milestone.findMany({ where: { userId, updatedAt: { gt: since } } }),
        tx.reminder.findMany({ where: { userId, updatedAt: { gt: since } } }),
        tx.deletedRecord.findMany({ where: { userId, deletedAt: { gt: since } } }),
      ]);
      const serverTime = new Date();
      await tx.synchronizationMetadata.upsert({ where: { userId }, create: { userId, lastSyncedAt: serverTime }, update: { lastSyncedAt: serverTime } });
      const response = { serverTime: serverTime.toISOString(), results, countdowns, milestones, reminders, deletions };
      await tx.syncRequest.create({ data: { userId, idempotencyKey: key, requestHash, response: JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue } });
      return response;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private validateSyncPayload(entity: SyncChange['entity'], id: string, input: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!input || input['id'] !== id) throw new BadRequestException('Sync payload must include the matching record id.');
    const allowed: Record<SyncChange['entity'], string[]> = {
      countdown: ['id', 'title', 'description', 'targetDate', 'timeZone', 'category', 'status', 'milestones', 'createdAt', 'updatedAt'],
      milestone: ['id', 'countdownId', 'title', 'description', 'date', 'offsetDays', 'done', 'isDefault'],
      reminder: ['id', 'countdownId', 'milestoneId', 'title', 'description', 'scheduledAt', 'timeZone', 'type', 'enabled', 'deliveryStatus', 'createdAt', 'updatedAt'],
    };
    if (Object.keys(input).some((key) => !allowed[entity].includes(key))) throw new BadRequestException('Sync payload contains unsupported fields.');
    if (entity === 'countdown' && input['milestones'] !== undefined && !Array.isArray(input['milestones'])) {
      throw new BadRequestException('Countdown milestones must be an array.');
    }
    const stringField = (field: string, maxLength: number, optional = false): boolean => {
      const value = input[field];
      if (optional && value === undefined) return true;
      return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
    };
    const dateField = (field: string): boolean => typeof input[field] === 'string' && Number.isFinite(Date.parse(input[field] as string));
    let valid = false;
    if (entity === 'countdown') valid = stringField('title', 64) && stringField('targetDate', 100) && dateField('targetDate') && stringField('timeZone', 100) &&
      ['personal', 'work', 'study', 'travel', 'health', 'finance', 'other'].includes(String(input['category'])) && ['active', 'paused', 'archived'].includes(String(input['status'])) && stringField('description', 2000, true);
    if (entity === 'milestone') valid = stringField('countdownId', 36) && stringField('title', 160) && stringField('date', 100) && dateField('date') && Number.isInteger(input['offsetDays']) && Number(input['offsetDays']) >= 0 && typeof input['done'] === 'boolean' && typeof input['isDefault'] === 'boolean' && stringField('description', 2000, true);
    if (entity === 'reminder') valid = stringField('countdownId', 36) && stringField('title', 160) && stringField('scheduledAt', 100) && dateField('scheduledAt') && stringField('timeZone', 100) && ['countdown', 'milestone', 'custom'].includes(String(input['type'])) && typeof input['enabled'] === 'boolean' && stringField('description', 2000, true) && (input['milestoneId'] === undefined || typeof input['milestoneId'] === 'string');
    if (!valid) throw new BadRequestException(`Sync ${entity} payload is invalid.`);
    if (entity === 'countdown') {
      const milestones = input['milestones'] as unknown[] | undefined;
      if (milestones && milestones.length > 100) throw new BadRequestException('A countdown may include at most 100 milestones per sync operation.');
      const ids = new Set<string>();
      for (const raw of milestones ?? []) {
        if (!raw || typeof raw !== 'object') throw new BadRequestException('Countdown milestone payload is invalid.');
        const milestone = raw as Record<string, unknown>;
        if (typeof milestone['id'] !== 'string' || ids.has(milestone['id']) || milestone['countdownId'] !== id || typeof milestone['title'] !== 'string' || !milestone['title'].trim() || milestone['title'].length > 160 || typeof milestone['date'] !== 'string' || !Number.isFinite(Date.parse(milestone['date'])) || !Number.isInteger(milestone['offsetDays']) || Number(milestone['offsetDays']) < 0 || typeof milestone['done'] !== 'boolean' || typeof milestone['isDefault'] !== 'boolean') throw new BadRequestException('Countdown milestone payload is invalid.');
        ids.add(milestone['id']);
      }
    }
    return input;
  }

  private async requireCountdown(tx: Prisma.TransactionClient, userId: string, countdownId: string): Promise<void> {
    if (!await tx.countdown.findFirst({ where: { id: countdownId, userId }, select: { id: true } })) throw new NotFoundException('Countdown not found.');
  }
}