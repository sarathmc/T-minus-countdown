import { createServer, Server } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PushService } from './push.service';

type WorkerMetrics = {
  startedAt: string;
  lastRunAt?: string;
  processed: number;
  errors: number;
  queue: Record<string, number>;
};

async function bootstrapWorker(): Promise<void> {
  const userIds = (process.env['PUSH_WORKER_USER_IDS'] ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  if (!userIds.length) throw new Error('PUSH_WORKER_USER_IDS must contain at least one user ID.');
  if (!process.env['VAPID_SUBJECT'] || !process.env['VAPID_PUBLIC_KEY'] || !process.env['VAPID_PRIVATE_KEY']) {
    throw new Error('VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY are required for the push worker.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const push = app.get(PushService);
  const metrics: WorkerMetrics = { startedAt: new Date().toISOString(), processed: 0, errors: 0, queue: {} };
  let running = false;
  let timer: NodeJS.Timeout | undefined;

  const runOnce = async (): Promise<void> => {
    if (running) return;
    running = true;
    metrics.lastRunAt = new Date().toISOString();
    try {
      const processed = await Promise.all(userIds.map((userId) => push.processDueForUser(userId)));
      metrics.processed += processed.reduce((total, count) => total + count, 0);
      const queues = await Promise.all(userIds.map((userId) => push.queueMetricsForUser(userId)));
      metrics.queue = queues.reduce<Record<string, number>>((total, queue) => {
        for (const [status, count] of Object.entries(queue)) total[status] = (total[status] ?? 0) + count;
        return total;
      }, {});
      console.log(JSON.stringify({ event: 'push_worker_cycle', processed: processed.reduce((total, count) => total + count, 0), queue: metrics.queue }));
    } catch (error) {
      metrics.errors += 1;
      console.error(JSON.stringify({ event: 'push_worker_error', message: error instanceof Error ? error.message : 'unknown error' }));
    } finally {
      running = false;
    }
  };

  const server: Server = createServer((request, response) => {
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

  const shutdown = async (): Promise<void> => {
    if (timer) clearInterval(timer);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
  server.listen(Number(process.env['PUSH_WORKER_PORT'] ?? 3001), '0.0.0.0');
  await runOnce();
  timer = setInterval(() => void runOnce(), Number(process.env['PUSH_WORKER_INTERVAL_MS'] ?? 30_000));
}

void bootstrapWorker().catch((error: unknown) => {
  console.error(JSON.stringify({ event: 'push_worker_startup_error', message: error instanceof Error ? error.message : 'unknown error' }));
  process.exitCode = 1;
});
