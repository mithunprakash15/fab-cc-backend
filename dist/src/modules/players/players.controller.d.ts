import { BattingStyle, BowlingStyle, PlayingRole } from '@prisma/client';
import { PlayersService } from './players.service';
declare class UpdatePlayerDto {
    name?: string;
    photoUrl?: string;
    jerseyNumber?: number;
    battingStyle?: BattingStyle;
    bowlingStyle?: BowlingStyle;
    playingRole?: PlayingRole;
}
declare class CreateLoginDto {
    email: string;
    password: string;
}
declare class UploadUrlDto {
    filename: string;
}
export declare class PlayersController {
    private players;
    constructor(players: PlayersService);
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
    me(req: any): import(".prisma/client").Prisma.Prisma__PlayerClient<{
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
    update(req: any, id: string, dto: UpdatePlayerDto): import(".prisma/client").Prisma.Prisma__PlayerClient<{
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
    createLogin(id: string, dto: CreateLoginDto): Promise<{
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
    uploadUrl(dto: UploadUrlDto): Promise<{
        signedUrl: string;
        token: string;
        path: string;
    }>;
}
export {};
