import { Request } from 'express';
import { PushSubscriptionDto } from '../resources/dtos';
import { PushService } from './push.service';
type UserRequest = Request & {
    userId: string;
};
export declare class PushController {
    private readonly push;
    constructor(push: PushService);
    register(req: UserRequest, dto: PushSubscriptionDto): Promise<{
        id: string;
        endpoint: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    list(req: UserRequest): Promise<{
        id: string;
        endpoint: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    remove(req: UserRequest, id: string): Promise<{
        deleted: true;
    }>;
}
export {};
