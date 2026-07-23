import { DisciplineService } from './discipline.service';
declare class ScoreDisciplineDto {
    playerId: string;
    weekStart?: string;
    attendance: number;
    punctuality: number;
    commitment: number;
    communication: number;
    respect: number;
    teamwork: number;
    sportsmanship: number;
    helpingOthers: number;
    behaviour: number;
    overall: number;
    comment?: string;
}
export declare class DisciplineController {
    private discipline;
    constructor(discipline: DisciplineService);
    score(dto: ScoreDisciplineDto): Promise<{
        id: string;
        createdAt: Date;
        attendance: number;
        playerId: string;
        weekStart: Date;
        punctuality: number;
        commitment: number;
        communication: number;
        respect: number;
        teamwork: number;
        sportsmanship: number;
        helpingOthers: number;
        behaviour: number;
        overall: number;
        comment: string | null;
    }>;
    history(playerId: string, req: any): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        attendance: number;
        playerId: string;
        weekStart: Date;
        punctuality: number;
        commitment: number;
        communication: number;
        respect: number;
        teamwork: number;
        sportsmanship: number;
        helpingOthers: number;
        behaviour: number;
        overall: number;
        comment: string | null;
    }[]>;
}
export {};
