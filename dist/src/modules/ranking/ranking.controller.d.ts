import { RankingPeriod } from '@prisma/client';
import { RankingService } from './ranking.service';
declare class WeightsDto {
    processWeight: number;
    performanceWeight: number;
    improvementWeight: number;
}
export declare class RankingController {
    private ranking;
    constructor(ranking: RankingService);
    leaderboard(category: string, period?: RankingPeriod): Promise<{
        rank: number;
        player: {
            id: string;
            name: string;
            photoUrl: string | null;
            playingRole: import(".prisma/client").$Enums.PlayingRole;
        };
        score: number;
        overallRating: number;
        percentile: number;
        tier: "Elite" | "Excellent" | "Very Good" | "Good" | "Average" | "Needs Improvement";
        movement: string;
    }[]>;
    config(dto: WeightsDto): Promise<{
        id: string;
        processWeight: number;
        performanceWeight: number;
        improvementWeight: number;
    }>;
    recompute(): Promise<void>;
}
export {};
