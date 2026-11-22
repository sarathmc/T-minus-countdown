"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("./database/prisma.service");
const auth_guard_1 = require("./auth/auth.guard");
const health_controller_1 = require("./health/health.controller");
const resources_controller_1 = require("./resources/resources.controller");
const resources_service_1 = require("./resources/resources.service");
const push_controller_1 = require("./push/push.controller");
const push_service_1 = require("./push/push.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule.forRoot({ isGlobal: true }), throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
        controllers: [health_controller_1.HealthController, resources_controller_1.ResourcesController, push_controller_1.PushController],
        providers: [prisma_service_1.PrismaService, resources_service_1.ResourcesService, push_service_1.PushService, auth_guard_1.AuthGuard, { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard }],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map