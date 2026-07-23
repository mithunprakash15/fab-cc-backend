import { PrismaService } from '../../prisma/prisma.service';
import { CommentaryParserService } from './commentary-parser.service';
import { CricheroesParserService } from './cricheroes-parser.service';
import { StatsEngineService } from '../stats/stats-engine.service';
import { RankingService } from '../ranking/ranking.service';
export declare class CommentaryService {
    private prisma;
    private parser;
    private cricheroes;
    private statsEngine;
    private ranking;
    private readonly logger;
    constructor(prisma: PrismaService, parser: CommentaryParserService, cricheroes: CricheroesParserService, statsEngine: StatsEngineService, ranking: RankingService);
    ingest(raw: string): Promise<{
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
    ingestJson(files: string[]): Promise<{
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
    private persist;
    private resolvePlayer;
    private ensurePlayerLogin;
    private uniquePlayerEmail;
    private inferResult;
}
