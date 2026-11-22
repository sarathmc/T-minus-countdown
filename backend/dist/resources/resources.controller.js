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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../auth/auth.guard");
const dtos_1 = require("./dtos");
const resources_service_1 = require("./resources.service");
let ResourcesController = class ResourcesController {
    resources;
    constructor(resources) {
        this.resources = resources;
    }
    profile(req) { return this.resources.profile(req.userId); }
    listCountdowns(req) { return this.resources.listCountdowns(req.userId); }
    createCountdown(req, dto, key) { return this.resources.createCountdown(req.userId, dto, key); }
    updateCountdown(req, id, dto, version) { return this.resources.updateCountdown(req.userId, id, dto, version); }
    deleteCountdown(req, id) { return this.resources.deleteCountdown(req.userId, id); }
    listMilestones(req) { return this.resources.listMilestones(req.userId); }
    createMilestone(req, dto) { return this.resources.createMilestone(req.userId, dto); }
    updateMilestone(req, id, dto) { return this.resources.updateMilestone(req.userId, id, dto); }
    deleteMilestone(req, id) { return this.resources.deleteMilestone(req.userId, id); }
    listReminders(req) { return this.resources.listReminders(req.userId); }
    createReminder(req, dto) { return this.resources.createReminder(req.userId, dto); }
    updateReminder(req, id, dto) { return this.resources.updateReminder(req.userId, id, dto); }
    deleteReminder(req, id) { return this.resources.deleteReminder(req.userId, id); }
    getSyncRecord(req, entity, id) { return this.resources.getSyncRecord(req.userId, entity, id); }
    sync(req, dto, key) { return this.resources.sync(req.userId, dto, key); }
};
exports.ResourcesController = ResourcesController;
__decorate([
    (0, common_1.Get)('auth/profile'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "profile", null);
__decorate([
    (0, common_1.Get)('countdowns'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "listCountdowns", null);
__decorate([
    (0, common_1.Post)('countdowns'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.CreateCountdownDto, String]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "createCountdown", null);
__decorate([
    (0, common_1.Patch)('countdowns/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('if-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dtos_1.UpdateCountdownDto, String]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "updateCountdown", null);
__decorate([
    (0, common_1.Delete)('countdowns/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "deleteCountdown", null);
__decorate([
    (0, common_1.Get)('milestones'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "listMilestones", null);
__decorate([
    (0, common_1.Post)('milestones'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.CreateMilestoneDto]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "createMilestone", null);
__decorate([
    (0, common_1.Patch)('milestones/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dtos_1.UpdateMilestoneDto]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "updateMilestone", null);
__decorate([
    (0, common_1.Delete)('milestones/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "deleteMilestone", null);
__decorate([
    (0, common_1.Get)('reminders'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "listReminders", null);
__decorate([
    (0, common_1.Post)('reminders'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.CreateReminderDto]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "createReminder", null);
__decorate([
    (0, common_1.Patch)('reminders/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dtos_1.UpdateReminderDto]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "updateReminder", null);
__decorate([
    (0, common_1.Delete)('reminders/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "deleteReminder", null);
__decorate([
    (0, common_1.Get)('sync/:entity/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('entity')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "getSyncRecord", null);
__decorate([
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.SyncRequestDto, String]),
    __metadata("design:returntype", void 0)
], ResourcesController.prototype, "sync", null);
exports.ResourcesController = ResourcesController = __decorate([
    (0, swagger_1.ApiTags)('resources'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [resources_service_1.ResourcesService])
], ResourcesController);
//# sourceMappingURL=resources.controller.js.map