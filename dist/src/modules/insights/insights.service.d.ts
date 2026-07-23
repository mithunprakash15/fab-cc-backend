import { PrismaService } from '../../prisma/prisma.service';
import { PlayerContextService } from './player-context.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class InsightsService {
    private prisma;
    private context;
    private notifications;
    private readonly logger;
    private anthropic;
    constructor(prisma: PrismaService, context: PlayerContextService, notifications: NotificationsService);
    weeklyReports(): Promise<void>;
    generate(playerId: string): Promise<Record<string, string[]>>;
    latest(playerId: string): Promise<Record<string, string[]>>;
}
