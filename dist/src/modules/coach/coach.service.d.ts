import { PrismaService } from '../../prisma/prisma.service';
import { PlayerContextService } from '../insights/player-context.service';
export declare class CoachService {
    private prisma;
    private playerContext;
    private anthropic;
    constructor(prisma: PrismaService, playerContext: PlayerContextService);
    chat(userId: string, playerId: string, message: string): Promise<{
        reply: string;
    }>;
    history(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        role: string;
        createdAt: Date;
        userId: string;
        content: string;
    }[]>;
}
