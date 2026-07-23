import { TrainingType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class TrainingService {
    private prisma;
    constructor(prisma: PrismaService);
    create(playerId: string, data: {
        date: string;
        durationMin: number;
        type: TrainingType;
        intensity: number;
        notes?: string;
        coach?: string;
        mediaUrls?: string[];
    }): import(".prisma/client").Prisma.Prisma__TrainingLogClient<{
        id: string;
        createdAt: Date;
        playerId: string;
        date: Date;
        type: import(".prisma/client").$Enums.TrainingType;
        coach: string | null;
        notes: string | null;
        durationMin: number;
        intensity: number;
        mediaUrls: string[];
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: string, playerId: string): Promise<{
        id: string;
        createdAt: Date;
        playerId: string;
        date: Date;
        type: import(".prisma/client").$Enums.TrainingType;
        coach: string | null;
        notes: string | null;
        durationMin: number;
        intensity: number;
        mediaUrls: string[];
    }>;
    list(playerId: string, since?: Date): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        playerId: string;
        date: Date;
        type: import(".prisma/client").$Enums.TrainingType;
        coach: string | null;
        notes: string | null;
        durationMin: number;
        intensity: number;
        mediaUrls: string[];
    }[]>;
    summary(playerId: string): Promise<{
        week: {
            sessions: number;
            minutes: number;
        };
        month: {
            sessions: number;
            minutes: number;
        };
        year: {
            sessions: number;
            minutes: number;
        };
        currentStreakDays: number;
        longestStreakDays: number;
        minutesByType: {
            [k: string]: number;
        };
        avgIntensity: number | null;
    }>;
}
