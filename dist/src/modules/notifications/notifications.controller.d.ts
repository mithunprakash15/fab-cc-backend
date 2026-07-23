import { NotificationsService } from './notifications.service';
declare class AnnouncementDto {
    title: string;
    body: string;
}
export declare class NotificationsController {
    private notifications;
    constructor(notifications: NotificationsService);
    feed(req: any): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        userId: string;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        title: string;
        type: import(".prisma/client").$Enums.NotificationType;
        body: string;
        readAt: Date | null;
    }[]>;
    markRead(req: any, id: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
    announce(dto: AnnouncementDto): Promise<void>;
}
export {};
