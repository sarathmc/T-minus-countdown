import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, IsUrl, Length, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateCountdownDto {
  @IsUUID() id!: string;
  @IsString() @Length(1, 64) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() targetDate!: string;
  @IsString() @MaxLength(100) timeZone!: string;
  @IsIn(['personal', 'work', 'study', 'travel', 'health', 'finance', 'other']) category!: string;
  @IsIn(['active', 'paused', 'archived']) status!: string;
  @IsDateString() createdAt!: string;
  @IsDateString() updatedAt!: string;
}

export class UpdateCountdownDto {
  @IsString() @Length(1, 64) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() targetDate!: string;
  @IsString() @MaxLength(100) timeZone!: string;
  @IsIn(['personal', 'work', 'study', 'travel', 'health', 'finance', 'other']) category!: string;
  @IsIn(['active', 'paused', 'archived']) status!: string;
  @IsDateString() updatedAt!: string;
}

export class CreateMilestoneDto {
  @IsUUID() id!: string;
  @IsUUID() countdownId!: string;
  @IsString() @Length(1, 160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() date!: string;
  @IsInt() @Min(0) offsetDays!: number;
  @IsBoolean() done!: boolean;
  @IsBoolean() isDefault!: boolean;
}

export class UpdateMilestoneDto {
  @IsString() @Length(1, 160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() date!: string;
  @IsInt() @Min(0) offsetDays!: number;
  @IsBoolean() done!: boolean;
  @IsBoolean() isDefault!: boolean;
}

export class CreateReminderDto {
  @IsUUID() id!: string;
  @IsUUID() countdownId!: string;
  @IsOptional() @IsUUID() milestoneId?: string;
  @IsString() @Length(1, 160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() scheduledAt!: string;
  @IsString() @MaxLength(100) timeZone!: string;
  @IsIn(['countdown', 'milestone', 'custom']) type!: string;
  @IsBoolean() enabled!: boolean;
}

export class UpdateReminderDto extends CreateReminderDto {}

export class PushSubscriptionDto {
  @IsUrl({ require_tld: false }) @MaxLength(2048) endpoint!: string;
  @IsString() @Length(16, 512) p256dh!: string;
  @IsString() @Length(16, 512) auth!: string;
}

export class SyncRequestDto {
  @IsOptional() @IsDateString() lastSyncedAt?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => SyncChange) changes?: SyncChange[];
}

export class SyncChange {
  @IsIn(['countdown', 'milestone', 'reminder']) entity!: 'countdown' | 'milestone' | 'reminder';
  @IsUUID() id!: string;
  @IsIn(['upsert', 'delete']) operation!: 'upsert' | 'delete';
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @IsOptional() @IsDateString() baseUpdatedAt?: string;
  @IsOptional() @IsInt() @Min(1) baseRevision?: number;
  @IsOptional() @IsBoolean() allowRestore?: boolean;
}