import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    private expo;
    constructor(prisma: PrismaService);
    send(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, unknown>): Promise<void>;
    broadcast(type: NotificationType, title: string, body: string, data?: Record<string, unknown>): Promise<void>;
    feed(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        userId: string;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        title: string;
        type: import(".prisma/client").$Enums.NotificationType;
        body: string;
        readAt: Date | null;
    }[]>;
    markRead(userId: string, id: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
}
