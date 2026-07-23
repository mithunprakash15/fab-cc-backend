import { CoachService } from './coach.service';
declare class ChatDto {
    message: string;
}
export declare class CoachController {
    private coach;
    constructor(coach: CoachService);
    chat(req: any, dto: ChatDto): Promise<{
        reply: string;
    }>;
    history(req: any): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        role: string;
        createdAt: Date;
        userId: string;
        content: string;
    }[]>;
}
export {};
