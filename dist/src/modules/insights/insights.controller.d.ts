import { InsightsService } from './insights.service';
export declare class InsightsController {
    private insights;
    constructor(insights: InsightsService);
    private assertAccess;
    latest(req: any, playerId: string): Promise<Record<string, string[]>>;
    generate(req: any, playerId: string): Promise<Record<string, string[]>>;
}
