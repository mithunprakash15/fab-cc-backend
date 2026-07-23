import { ExerciseService } from './exercise.service';
declare class CreateExerciseDto {
    date: string;
    activity: string;
    durationMin: number;
    distanceKm?: number;
    calories?: number;
    notes?: string;
}
export declare class ExerciseController {
    private exercise;
    constructor(exercise: ExerciseService);
    private playerId;
    create(req: any, dto: CreateExerciseDto): import(".prisma/client").Prisma.Prisma__ExerciseLogClient<{
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
    list(req: any, since?: string): import(".prisma/client").Prisma.PrismaPromise<{
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
    summary(req: any, playerId?: string): Promise<{
        weeklyHours: number;
        monthlyHours: number;
        currentStreakDays: number;
        longestStreakDays: number;
        totalDistanceKm: number;
    }>;
    remove(req: any, id: string): Promise<{
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
}
export {};
