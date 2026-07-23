import { TrainingType } from '@prisma/client';
import { TrainingService } from './training.service';
declare class CreateTrainingDto {
    date: string;
    durationMin: number;
    type: TrainingType;
    intensity: number;
    notes?: string;
    coach?: string;
    mediaUrls?: string[];
}
export declare class TrainingController {
    private training;
    constructor(training: TrainingService);
    private playerId;
    create(req: any, dto: CreateTrainingDto): import(".prisma/client").Prisma.Prisma__TrainingLogClient<{
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
    list(req: any, since?: string, playerId?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    summary(req: any, playerId?: string): Promise<{
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
    remove(req: any, id: string): Promise<{
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
}
export {};
