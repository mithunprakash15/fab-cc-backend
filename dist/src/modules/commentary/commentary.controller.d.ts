import { CommentaryService } from './commentary.service';
declare class UploadCommentaryDto {
    raw: string;
}
declare class UploadJsonDto {
    files: string[];
}
export declare class CommentaryController {
    private service;
    constructor(service: CommentaryService);
    upload(dto: UploadCommentaryDto): Promise<{
        innings: ({
            battingInnings: ({
                player: {
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
                };
            } & {
                id: string;
                playerId: string;
                inningsId: string;
                runs: number;
                balls: number;
                fours: number;
                sixes: number;
                isOut: boolean;
                dismissalType: import(".prisma/client").$Enums.DismissalType | null;
                dismissedBy: string | null;
                battingOrder: number;
            })[];
            bowlingSpells: ({
                player: {
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
                };
            } & {
                id: string;
                playerId: string;
                inningsId: string;
                runs: number;
                balls: number;
                wickets: number;
                maidens: number;
                wides: number;
                noBalls: number;
            })[];
        } & {
            number: number;
            id: string;
            matchId: string;
            battingTeam: string;
            totalRuns: number;
            totalWickets: number;
            totalOvers: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        result: import(".prisma/client").$Enums.MatchResult | null;
        date: Date;
        title: string;
        opponent: string;
        venue: string | null;
        overs: number | null;
        resultText: string | null;
        rawCommentary: string | null;
    }>;
    uploadJson(dto: UploadJsonDto): Promise<{
        innings: ({
            battingInnings: ({
                player: {
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
                };
            } & {
                id: string;
                playerId: string;
                inningsId: string;
                runs: number;
                balls: number;
                fours: number;
                sixes: number;
                isOut: boolean;
                dismissalType: import(".prisma/client").$Enums.DismissalType | null;
                dismissedBy: string | null;
                battingOrder: number;
            })[];
            bowlingSpells: ({
                player: {
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
                };
            } & {
                id: string;
                playerId: string;
                inningsId: string;
                runs: number;
                balls: number;
                wickets: number;
                maidens: number;
                wides: number;
                noBalls: number;
            })[];
        } & {
            number: number;
            id: string;
            matchId: string;
            battingTeam: string;
            totalRuns: number;
            totalWickets: number;
            totalOvers: string | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        result: import(".prisma/client").$Enums.MatchResult | null;
        date: Date;
        title: string;
        opponent: string;
        venue: string | null;
        overs: number | null;
        resultText: string | null;
        rawCommentary: string | null;
    }>;
}
export {};
