import { BattingStyle, BowlingStyle, PlayingRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export interface UpdatePlayerInput {
    name?: string;
    photoUrl?: string;
    jerseyNumber?: number;
    battingStyle?: BattingStyle;
    bowlingStyle?: BowlingStyle;
    playingRole?: PlayingRole;
}
export declare class PlayersService {
    private prisma;
    private supabase;
    constructor(prisma: PrismaService);
    list(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string | null;
        normalizedName: string;
        cricheroesId: number | null;
        photoUrl: string | null;
        jerseyNumber: number | null;
        battingStyle: import(".prisma/client").$Enums.BattingStyle | null;
        bowlingStyle: import(".prisma/client").$Enums.BowlingStyle;
        playingRole: import(".prisma/client").$Enums.PlayingRole;
        isActive: boolean;
        autoCreated: boolean;
    }[]>;
    get(id: string): import(".prisma/client").Prisma.Prisma__PlayerClient<{
        user: {
            email: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string | null;
        normalizedName: string;
        cricheroesId: number | null;
        photoUrl: string | null;
        jerseyNumber: number | null;
        battingStyle: import(".prisma/client").$Enums.BattingStyle | null;
        bowlingStyle: import(".prisma/client").$Enums.BowlingStyle;
        playingRole: import(".prisma/client").$Enums.PlayingRole;
        isActive: boolean;
        autoCreated: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, data: UpdatePlayerInput): import(".prisma/client").Prisma.Prisma__PlayerClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string | null;
        normalizedName: string;
        cricheroesId: number | null;
        photoUrl: string | null;
        jerseyNumber: number | null;
        battingStyle: import(".prisma/client").$Enums.BattingStyle | null;
        bowlingStyle: import(".prisma/client").$Enums.BowlingStyle;
        playingRole: import(".prisma/client").$Enums.PlayingRole;
        isActive: boolean;
        autoCreated: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    deactivate(id: string): import(".prisma/client").Prisma.Prisma__PlayerClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string | null;
        normalizedName: string;
        cricheroesId: number | null;
        photoUrl: string | null;
        jerseyNumber: number | null;
        battingStyle: import(".prisma/client").$Enums.BattingStyle | null;
        bowlingStyle: import(".prisma/client").$Enums.BowlingStyle;
        playingRole: import(".prisma/client").$Enums.PlayingRole;
        isActive: boolean;
        autoCreated: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    createLogin(playerId: string, email: string, password: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string | null;
        normalizedName: string;
        cricheroesId: number | null;
        photoUrl: string | null;
        jerseyNumber: number | null;
        battingStyle: import(".prisma/client").$Enums.BattingStyle | null;
        bowlingStyle: import(".prisma/client").$Enums.BowlingStyle;
        playingRole: import(".prisma/client").$Enums.PlayingRole;
        isActive: boolean;
        autoCreated: boolean;
    }>;
    signedUploadUrl(path: string): Promise<{
        signedUrl: string;
        token: string;
        path: string;
    }>;
}
