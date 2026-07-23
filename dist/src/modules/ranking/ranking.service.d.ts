import { RankingPeriod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare const TIERS: readonly [{
    readonly min: 90;
    readonly label: "Elite";
}, {
    readonly min: 80;
    readonly label: "Excellent";
}, {
    readonly min: 70;
    readonly label: "Very Good";
}, {
    readonly min: 60;
    readonly label: "Good";
}, {
    readonly min: 45;
    readonly label: "Average";
}, {
    readonly min: 0;
    readonly label: "Needs Improvement";
}];
export declare const tierFor: (rating: number) => "Elite" | "Excellent" | "Very Good" | "Good" | "Average" | "Needs Improvement";
export declare class RankingService {
    private prisma;
    private notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    nightly(): Promise<void>;
    recompute(period?: RankingPeriod): Promise<void>;
    private processScore;
    private performanceRaw;
    private improvementScore;
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
    updateConfig(weights: {
        processWeight: number;
        performanceWeight: number;
        improvementWeight: number;
    }): Promise<{
        id: string;
        processWeight: number;
        performanceWeight: number;
        improvementWeight: number;
    }>;
}
