import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
export declare class PlayerContextService {
    private prisma;
    private stats;
    constructor(prisma: PrismaService, stats: StatsService);
    build(playerId: string): Promise<string>;
}
