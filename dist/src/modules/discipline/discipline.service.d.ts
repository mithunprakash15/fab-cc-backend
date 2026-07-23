import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export interface DisciplineInput {
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
export declare class DisciplineService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    score(input: DisciplineInput): Promise<{
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
    history(playerId: string): import(".prisma/client").Prisma.PrismaPromise<{
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
