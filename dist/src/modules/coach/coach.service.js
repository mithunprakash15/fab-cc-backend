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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachService = void 0;
const common_1 = require("@nestjs/common");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const prisma_service_1 = require("../../prisma/prisma.service");
const player_context_service_1 = require("../insights/player-context.service");
const SYSTEM_BASE = `You are the personal AI cricket coach for a FAB CC player.
Answer questions using ONLY the player's data provided below — their statistics,
training history, exercise logs, attendance, discipline scores, and ranking
history. Be specific and cite numbers from the data. Be encouraging but honest
about weaknesses. Give practical, cricket-specific advice (drills, net-session
plans, fitness routines). If asked something the data can't answer, say so.
Keep answers under 200 words unless a detailed plan is requested.`;
let CoachService = class CoachService {
    prisma;
    playerContext;
    anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    constructor(prisma, playerContext) {
        this.prisma = prisma;
        this.playerContext = playerContext;
    }
    async chat(userId, playerId, message) {
        const [context, history] = await Promise.all([
            this.playerContext.build(playerId),
            this.prisma.coachMessage.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);
        const messages = [
            ...history.reverse().map((m) => ({
                role: m.role,
                content: m.content,
            })),
            { role: 'user', content: message },
        ];
        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-5',
            max_tokens: 1000,
            system: `${SYSTEM_BASE}\n\nPlayer data:\n${context}`,
            messages,
        });
        const reply = response.content.find((b) => b.type === 'text')?.text ?? '';
        await this.prisma.coachMessage.createMany({
            data: [
                { userId, role: 'user', content: message },
                { userId, role: 'assistant', content: reply },
            ],
        });
        return { reply };
    }
    history(userId) {
        return this.prisma.coachMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });
    }
};
exports.CoachService = CoachService;
exports.CoachService = CoachService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        player_context_service_1.PlayerContextService])
], CoachService);
//# sourceMappingURL=coach.service.js.map