"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncChange = exports.SyncRequestDto = exports.PushSubscriptionDto = exports.UpdateReminderDto = exports.CreateReminderDto = exports.UpdateMilestoneDto = exports.CreateMilestoneDto = exports.UpdateCountdownDto = exports.CreateCountdownDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateCountdownDto {
    id;
    title;
    description;
    targetDate;
    timeZone;
    category;
    status;
    createdAt;
    updatedAt;
}
exports.CreateCountdownDto = CreateCountdownDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 64),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "targetDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "timeZone", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['personal', 'work', 'study', 'travel', 'health', 'finance', 'other']),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['active', 'paused', 'archived']),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCountdownDto.prototype, "updatedAt", void 0);
class UpdateCountdownDto {
    title;
    description;
    targetDate;
    timeZone;
    category;
    status;
    updatedAt;
}
exports.UpdateCountdownDto = UpdateCountdownDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 64),
    __metadata("design:type", String)
], UpdateCountdownDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateCountdownDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateCountdownDto.prototype, "targetDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateCountdownDto.prototype, "timeZone", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['personal', 'work', 'study', 'travel', 'health', 'finance', 'other']),
    __metadata("design:type", String)
], UpdateCountdownDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['active', 'paused', 'archived']),
    __metadata("design:type", String)
], UpdateCountdownDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateCountdownDto.prototype, "updatedAt", void 0);
class CreateMilestoneDto {
    id;
    countdownId;
    title;
    description;
    date;
    offsetDays;
    done;
    isDefault;
}
exports.CreateMilestoneDto = CreateMilestoneDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMilestoneDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMilestoneDto.prototype, "countdownId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 160),
    __metadata("design:type", String)
], CreateMilestoneDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateMilestoneDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMilestoneDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMilestoneDto.prototype, "offsetDays", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMilestoneDto.prototype, "done", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMilestoneDto.prototype, "isDefault", void 0);
class UpdateMilestoneDto {
    title;
    description;
    date;
    offsetDays;
    done;
    isDefault;
}
exports.UpdateMilestoneDto = UpdateMilestoneDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 160),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateMilestoneDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMilestoneDto.prototype, "offsetDays", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateMilestoneDto.prototype, "done", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateMilestoneDto.prototype, "isDefault", void 0);
class CreateReminderDto {
    id;
    countdownId;
    milestoneId;
    title;
    description;
    scheduledAt;
    timeZone;
    type;
    enabled;
}
exports.CreateReminderDto = CreateReminderDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "countdownId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "milestoneId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 160),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "timeZone", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['countdown', 'milestone', 'custom']),
    __metadata("design:type", String)
], CreateReminderDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateReminderDto.prototype, "enabled", void 0);
class UpdateReminderDto extends CreateReminderDto {
}
exports.UpdateReminderDto = UpdateReminderDto;
class PushSubscriptionDto {
    endpoint;
    p256dh;
    auth;
}
exports.PushSubscriptionDto = PushSubscriptionDto;
__decorate([
    (0, class_validator_1.IsUrl)({ require_tld: false }),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], PushSubscriptionDto.prototype, "endpoint", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(16, 512),
    __metadata("design:type", String)
], PushSubscriptionDto.prototype, "p256dh", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(16, 512),
    __metadata("design:type", String)
], PushSubscriptionDto.prototype, "auth", void 0);
class SyncRequestDto {
    lastSyncedAt;
    changes;
}
exports.SyncRequestDto = SyncRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SyncRequestDto.prototype, "lastSyncedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(500),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SyncChange),
    __metadata("design:type", Array)
], SyncRequestDto.prototype, "changes", void 0);
class SyncChange {
    entity;
    id;
    operation;
    payload;
    baseUpdatedAt;
    baseRevision;
    allowRestore;
}
exports.SyncChange = SyncChange;
__decorate([
    (0, class_validator_1.IsIn)(['countdown', 'milestone', 'reminder']),
    __metadata("design:type", String)
], SyncChange.prototype, "entity", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SyncChange.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['upsert', 'delete']),
    __metadata("design:type", String)
], SyncChange.prototype, "operation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SyncChange.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SyncChange.prototype, "baseUpdatedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SyncChange.prototype, "baseRevision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SyncChange.prototype, "allowRestore", void 0);
//# sourceMappingURL=dtos.js.map