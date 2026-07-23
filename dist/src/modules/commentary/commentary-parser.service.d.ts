import { DismissalType } from '@prisma/client';
export interface ParsedBall {
    over: number;
    ballInOver: number;
    batter: string;
    bowler: string;
    batterId?: number;
    bowlerId?: number;
    fielderId?: number;
    dismissedBatterId?: number;
    runsBat: number;
    extras: number;
    extraType: 'wide' | 'no-ball' | 'bye' | 'leg-bye' | null;
    isFour: boolean;
    isSix: boolean;
    isWicket: boolean;
    dismissalType: DismissalType | null;
    dismissedBatter: string | null;
    fielder: string | null;
    raw: string;
}
export interface ParsedInnings {
    number: number;
    battingTeam: string;
    balls: ParsedBall[];
}
export interface ParsedMatch {
    title: string;
    opponent: string;
    venue: string | null;
    date: Date;
    overs: number | null;
    resultText: string | null;
    innings: ParsedInnings[];
}
export declare class CommentaryParserService {
    parse(raw: string): ParsedMatch;
    private applyMeta;
    private parseBall;
    private parseWicket;
}
