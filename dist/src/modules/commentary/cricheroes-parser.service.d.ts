import { ParsedMatch } from './commentary-parser.service';
export declare class CricheroesParserService {
    static readonly FAB_TEAM_ID: number;
    parse(roots: any[]): ParsedMatch;
    private parseInnings;
    private parseLine;
    private parseOutHow;
    private mapDismissal;
}
