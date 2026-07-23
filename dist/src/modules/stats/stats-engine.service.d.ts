import { PrismaService } from '../../prisma/prisma.service';
export declare class StatsEngineService {
    private prisma;
    constructor(prisma: PrismaService);
    buildScorecards(matchId: string): Promise<void>;
}
