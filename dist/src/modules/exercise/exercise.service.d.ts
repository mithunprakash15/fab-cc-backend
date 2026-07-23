import { PrismaService } from '../../prisma/prisma.service';
export declare class ExerciseService {
    private prisma;
    constructor(prisma: PrismaService);
    create(playerId: string, data: {
        date: string;
        activity: string;
        durationMin: number;
        distanceKm?: number;
        calories?: number;
        notes?: string;
    }): import(".prisma/client").Prisma.Prisma__ExerciseLogClient<{
        id: string;
        createdAt: Date;
        playerId: string;
        date: Date;
        notes: string | null;
        durationMin: number;
        activity: string;
        distanceKm: number | null;
        calories: number | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: string, playerId: string): Promise<{
        id: string;
        createdAt: Date;
        playerId: string;
        date: Date;
        notes: string | null;
        durationMin: number;
        activity: string;
        distanceKm: number | null;
        calories: number | null;
    }>;
    list(playerId: string, since?: Date): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        playerId: string;
        date: Date;
        notes: string | null;
        durationMin: number;
        activity: string;
        distanceKm: number | null;
        calories: number | null;
    }[]>;
    summary(playerId: string): Promise<{
        weeklyHours: number;
        monthlyHours: number;
        currentStreakDays: number;
        longestStreakDays: number;
        totalDistanceKm: number;
    }>;
}
