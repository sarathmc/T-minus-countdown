import { PrismaService } from '../database/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealth(): {
        status: 'ok';
    };
    getReadiness(): Promise<{
        status: 'ok';
        database: 'ok';
    }>;
}
