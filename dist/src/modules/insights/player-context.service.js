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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerContextService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const prisma_service_1 = require("../../prisma/prisma.service");
const stats_service_1 = require("../stats/stats.service");
let PlayerContextService = class PlayerContextService {
    prisma;
    stats;
    constructor(prisma, stats) {
        this.prisma = prisma;
        this.stats = stats;
    }
    async build(playerId) {
        const since = (0, date_fns_1.subDays)(new Date(), 60);
        const [player, stats, training, exercise, attendance, discipline, snapshots] = await Promise.all([
            this.prisma.player.findUniqueOrThrow({ where: { id: playerId } }),
            this.stats.playerStats(playerId),
            this.prisma.trainingLog.findMany({
                where: { playerId, date: { gte: since } }, orderBy: { date: 'desc' },
            }),
            this.prisma.exerciseLog.findMany({
                where: { playerId, date: { gte: since } }, orderBy: { date: 'desc' },
            }),
            this.prisma.attendanceRecord.findMany({
                where: { playerId, event: { date: { gte: since } } }, include: { event: true },
            }),
            this.prisma.disciplineScore.findMany({
                where: { playerId }, orderBy: { weekStart: 'desc' }, take: 8,
            }),
            this.prisma.rankingSnapshot.findMany({
                where: { playerId, period: 'WEEKLY' }, orderBy: { periodStart: 'desc' }, take: 8,
            }),
        ]);
        return JSON.stringify({
            player: {
                name: player.name, role: player.playingRole,
                battingStyle: player.battingStyle, bowlingStyle: player.bowlingStyle,
            },
            careerStats: stats,
            last60Days: {
                trainingSessions: training.map((t) => ({
                    date: t.date.toISOString().slice(0, 10), type: t.type,
                    minutes: t.durationMin, intensity: t.intensity,
                })),
                exerciseSessions: exercise.map((e) => ({
                    date: e.date.toISOString().slice(0, 10), activity: e.activity,
                    minutes: e.durationMin, km: e.distanceKm,
                })),
                attendance: attendance.map((a) => ({
                    date: a.event.date.toISOString().slice(0, 10),
                    event: a.event.title, status: a.status,
                })),
            },
            weeklyDiscipline: discipline.map((d) => ({
                week: d.weekStart.toISOString().slice(0, 10), overall: d.overall,
                comment: d.comment,
            })),
            rankingHistory: snapshots.map((s) => ({
                week: s.periodStart.toISOString().slice(0, 10), rank: s.rank,
                overall: +s.overallRating.toFixed(1), process: +s.processScore.toFixed(1),
                performance: +s.performanceScore.toFixed(1),
            })),
        }, null, 1);
    }
};
exports.PlayerContextService = PlayerContextService;
exports.PlayerContextService = PlayerContextService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stats_service_1.StatsService])
], PlayerContextService);
//# sourceMappingURL=player-context.service.js.map