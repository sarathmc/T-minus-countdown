"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const push_service_1 = require("./push.service");
async function bootstrapWorker() {
    const userIds = (process.env['PUSH_WORKER_USER_IDS'] ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    if (!userIds.length)
        throw new Error('PUSH_WORKER_USER_IDS must contain at least one user ID.');
    if (!process.env['VAPID_SUBJECT'] || !process.env['VAPID_PUBLIC_KEY'] || !process.env['VAPID_PRIVATE_KEY']) {
        throw new Error('VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY are required for the push worker.');
    }
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: false });
    const push = app.get(push_service_1.PushService);
    const metrics = { startedAt: new Date().toISOString(), processed: 0, errors: 0, queue: {} };
    let running = false;
    let timer;
    const runOnce = async () => {
        if (running)
            return;
        running = true;
        metrics.lastRunAt = new Date().toISOString();
        try {
            const processed = await Promise.all(userIds.map((userId) => push.processDueForUser(userId)));
            metrics.processed += processed.reduce((total, count) => total + count, 0);
            const queues = await Promise.all(userIds.map((userId) => push.queueMetricsForUser(userId)));
            metrics.queue = queues.reduce((total, queue) => {
                for (const [status, count] of Object.entries(queue))
                    total[status] = (total[status] ?? 0) + count;
                return total;
            }, {});
            console.log(JSON.stringify({ event: 'push_worker_cycle', processed: processed.reduce((total, count) => total + count, 0), queue: metrics.queue }));
        }
        catch (error) {
            metrics.errors += 1;
            console.error(JSON.stringify({ event: 'push_worker_error', message: error instanceof Error ? error.message : 'unknown error' }));
        }
        finally {
            running = false;
        }
    };
    const server = (0, node_http_1.createServer)((request, response) => {
        if (request.url === '/health') {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ status: 'ok', worker: 'push', ...metrics }));
            return;
        }
        if (request.url === '/metrics') {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify(metrics));
            return;
        }
        response.writeHead(404);
        response.end();
    });
    const shutdown = async () => {
        if (timer)
            clearInterval(timer);
        await new Promise((resolve) => server.close(() => resolve()));
        await app.close();
    };
    process.once('SIGTERM', () => void shutdown());
    process.once('SIGINT', () => void shutdown());
    server.listen(Number(process.env['PUSH_WORKER_PORT'] ?? 3001), '0.0.0.0');
    await runOnce();
    timer = setInterval(() => void runOnce(), Number(process.env['PUSH_WORKER_INTERVAL_MS'] ?? 30_000));
}
void bootstrapWorker().catch((error) => {
    console.error(JSON.stringify({ event: 'push_worker_startup_error', message: error instanceof Error ? error.message : 'unknown error' }));
    process.exitCode = 1;
});
//# sourceMappingURL=push-worker.js.map