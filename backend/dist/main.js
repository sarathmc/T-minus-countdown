"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const express_1 = require("express");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    if (process.env['NODE_ENV'] === 'production') {
        const required = ['DATABASE_URL', 'SUPABASE_URL', 'FRONTEND_ORIGINS'];
        const missing = required.filter((name) => !process.env[name]?.trim());
        if (missing.length || process.env['FRONTEND_ORIGINS']?.includes('*')) {
            throw new Error(`Invalid production configuration${missing.length ? `; missing ${missing.join(', ')}` : '; wildcard CORS is not allowed'}.`);
        }
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bodyParser: false });
    app.enableShutdownHooks();
    app.use((0, express_1.json)({ limit: process.env['JSON_BODY_LIMIT'] ?? '256kb' }));
    const origins = (process.env['FRONTEND_ORIGINS'] ?? 'http://localhost:4200').split(',').map((item) => item.trim());
    app.enableCors({ origin: origins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type', 'If-Match', 'Idempotency-Key'] });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const swagger = new swagger_1.DocumentBuilder().setTitle('T-Minus API').setDescription('User-scoped local-first synchronization API').setVersion('1.0').addBearerAuth().build();
    swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, swagger));
    await app.listen(Number(process.env['PORT'] ?? 3000), '0.0.0.0');
}
void bootstrap();
//# sourceMappingURL=main.js.map