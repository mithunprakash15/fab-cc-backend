"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var InsightsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const player_context_service_1 = require("./player-context.service");
const notifications_service_1 = require("../notifications/notifications.service");
const SYSTEM = `You are the AI performance analyst for FAB CC, an amateur cricket club.
You receive one player's complete data (stats, training, exercise, attendance,
discipline, ranking history) as JSON. Produce concise, specific, motivating
feedback grounded ONLY in that data — cite concrete numbers ("you attended 7 of
8 sessions", "strike rate up 15% over your last 6 innings"). Never invent data.
Respond as strict JSON: {"strengths": string[], "weaknesses": string[],
"weeklyGoals": string[], "monthlyGoals": string[], "suggestions": string[],
"report": string} where report is a 3-4 sentence weekly summary.`;
let InsightsService = InsightsService_1 = class InsightsService {
    prisma;
    context;
    notifications;
    logger = new common_1.Logger(InsightsService_1.name);
    anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    constructor(prisma, context, notifications) {
        this.prisma = prisma;
        this.context = context;
        this.notifications = notifications;
    }
    async weeklyReports() {
        const players = await this.prisma.player.findMany({
            where: { isActive: true, userId: { not: null } },
            include: { user: true },
        });
        for (const player of players) {
            try {
                await this.generate(player.id);
                await this.notifications.send(player.user.id, 'AI_WEEKLY_REPORT', 'Your AI weekly report is ready', 'Open the app to see your strengths, goals, and suggestions for this week.');
            }
            catch (err) {
                this.logger.error(`Insight generation failed for ${player.name}: ${err}`);
            }
        }
    }
    async generate(playerId) {
        const context = await this.context.build(playerId);
        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 1500,
            system: SYSTEM,
            messages: [{ role: 'user', content: `Player data:\n${context}` }],
        });
        const text = response.content.find((b) => b.type === 'text')?.text ?? '{}';
        const parsed = JSON.parse(text.replace(/^```json?\s*|\s*```$/g, ''));
        const kinds = [
            [client_1.InsightKind.STRENGTH, parsed.strengths ?? []],
            [client_1.InsightKind.WEAKNESS, parsed.weaknesses ?? []],
            [client_1.InsightKind.WEEKLY_GOAL, parsed.weeklyGoals ?? []],
            [client_1.InsightKind.MONTHLY_GOAL, parsed.monthlyGoals ?? []],
            [client_1.InsightKind.SUGGESTION, parsed.suggestions ?? []],
            [client_1.InsightKind.REPORT, parsed.report ? [parsed.report] : []],
        ];
        await this.prisma.aiInsight.createMany({
            data: kinds.flatMap(([kind, items]) => items.map((content) => ({ playerId, kind, content }))),
        });
        return this.latest(playerId);
    }
    async latest(playerId) {
        const insights = await this.prisma.aiInsight.findMany({
            where: { playerId },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        const grouped = {};
        for (const i of insights)
            (grouped[i.kind] ??= []).push(i.content);
        return grouped;
    }
};
exports.InsightsService = InsightsService;
__decorate([
    (0, schedule_1.Cron)('0 6 * * 1'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InsightsService.prototype, "weeklyReports", null);
exports.InsightsService = InsightsService = InsightsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        player_context_service_1.PlayerContextService,
        notifications_service_1.NotificationsService])
], InsightsService);
//# sourceMappingURL=insights.service.js.map