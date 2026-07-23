import { StatsService } from './stats.service';
export declare class StatsController {
    private stats;
    constructor(stats: StatsService);
    playerStats(id: string, since?: string): Promise<{
        matches: number;
        batting: {
            innings: number;
            runs: number;
            balls: number;
            average: number | null;
            strikeRate: number | null;
            highestScore: number;
            fours: number;
            sixes: number;
            thirties: number;
            fifties: number;
            hundreds: number;
            ducks: number;
            notOuts: number;
        };
        bowling: {
            overs: string;
            wickets: number;
            runsConceded: number;
            economy: number | null;
            average: number | null;
            strikeRate: number | null;
            maidens: number;
        };
        fielding: {
            catches: number;
            runOuts: number;
            stumpings: number;
        };
        dismissals: {
            mostCommon: [string, number];
            mostDismissedBy: [string, number];
            breakdown: {
                [k: string]: number;
            };
        };
        recentInnings: {
            matchId: string;
            matchTitle: string;
            date: Date;
            runs: number;
            balls: number;
            isOut: boolean;
        }[];
    }>;
    matches(): Promise<({
        innings: {
            number: number;
            id: string;
            matchId: string;
            battingTeam: string;
            totalRuns: number;
            totalWickets: number;
            totalOvers: string | null;
        }[];
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
    })[]>;
    teamSummary(): Promise<{
        played: number;
        won: number;
        lost: number;
        tied: number;
        noResult: number;
        winPct: number;
        trend: {
            id: string;
            result: import(".prisma/client").$Enums.MatchResult | null;
            title: string;
            date: Date;
        }[];
    }>;
    scorecard(id: string): Promise<{
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
            fieldingEfforts: ({
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
                catches: number;
                runOuts: number;
                stumpings: number;
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
