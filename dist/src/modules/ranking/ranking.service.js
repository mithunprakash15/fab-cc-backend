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
var RankingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingService = exports.tierFor = exports.TIERS = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const ATTENDANCE_WEIGHT = {
    PRESENT: 1, LATE: 0.7, EXCUSED: 0.5, ABSENT: 0,
};
exports.TIERS = [
    { min: 90, label: 'Elite' },
    { min: 80, label: 'Excellent' },
    { min: 70, label: 'Very Good' },
    { min: 60, label: 'Good' },
    { min: 45, label: 'Average' },
    { min: 0, label: 'Needs Improvement' },
];
const tierFor = (rating) => exports.TIERS.find((t) => rating >= t.min).label;
exports.tierFor = tierFor;
let RankingService = RankingService_1 = class RankingService {
    prisma;
    notifications;
    logger = new common_1.Logger(RankingService_1.name);
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async nightly() {
        await this.recompute();
    }
    async recompute(period = client_1.RankingPeriod.WEEKLY) {
        const config = (await this.prisma.rankingConfig.findUnique({ where: { id: 'default' } })) ??
            (await this.prisma.rankingConfig.create({ data: { id: 'default' } }));
        const players = await this.prisma.player.findMany({ where: { isActive: true } });
        const now = new Date();
        const periodStart = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 });
        const windowStart = (0, date_fns_1.subDays)(now, 28);
        const seasonStart = (0, date_fns_1.subDays)(now, 180);
        const rows = [];
        for (const p of players) {
            rows.push({
                playerId: p.id,
                process: await this.processScore(p.id, windowStart, now),
                performanceRaw: await this.performanceRaw(p.id, seasonStart),
                improvement: await this.improvementScore(p.id),
            });
        }
        const norm = (vals) => {
            const max = Math.max(...vals, 1);
            return (v) => (v / max) * 100;
        };
        const nb = norm(rows.map((r) => r.performanceRaw.batting));
        const nw = norm(rows.map((r) => r.performanceRaw.bowling));
        const nf = norm(rows.map((r) => r.performanceRaw.fielding));
        const ni = norm(rows.map((r) => r.performanceRaw.impact));
        const scored = rows.map((r) => {
            const batting = nb(r.performanceRaw.batting);
            const bowling = nw(r.performanceRaw.bowling);
            const fielding = nf(r.performanceRaw.fielding);
            const impact = ni(r.performanceRaw.impact);
            const performance = clamp(Math.max(batting, bowling) * 0.55 +
                Math.min(batting, bowling) * 0.2 +
                fielding * 0.15 +
                impact * 0.1);
            const overall = clamp(r.process * config.processWeight +
                performance * config.performanceWeight +
                r.improvement * config.improvementWeight);
            return { ...r, batting, bowling, fielding, performance, overall };
        });
        scored.sort((a, b) => b.overall - a.overall);
        for (let i = 0; i < scored.length; i++) {
            const s = scored[i];
            const rank = i + 1;
            const previous = await this.prisma.rankingSnapshot.findFirst({
                where: { playerId: s.playerId, period, periodStart: { lt: periodStart } },
                orderBy: { periodStart: 'desc' },
            });
            await this.prisma.rankingSnapshot.upsert({
                where: {
                    playerId_period_periodStart: { playerId: s.playerId, period, periodStart },
                },
                create: {
                    playerId: s.playerId, period, periodStart,
                    processScore: s.process, performanceScore: s.performance,
                    improvementScore: s.improvement, overallRating: s.overall,
                    battingScore: s.batting, bowlingScore: s.bowling, fieldingScore: s.fielding,
                    rank, previousRank: previous?.rank ?? null,
                },
                update: {
                    processScore: s.process, performanceScore: s.performance,
                    improvementScore: s.improvement, overallRating: s.overall,
                    battingScore: s.batting, bowlingScore: s.bowling, fieldingScore: s.fielding,
                    rank, previousRank: previous?.rank ?? null,
                },
            });
            if (previous && previous.rank !== rank) {
                const player = await this.prisma.player.findUnique({
                    where: { id: s.playerId }, include: { user: true },
                });
                if (player?.user) {
                    const up = rank < previous.rank;
                    await this.notifications.send(player.user.id, 'RANKING_CHANGE', up ? `You moved up to #${rank} ▲` : `You dropped to #${rank} ▼`, `Overall rating ${s.overall.toFixed(1)} (${(0, exports.tierFor)(s.overall)}).`);
                }
            }
        }
        this.logger.log(`Recomputed ${period} rankings for ${scored.length} players`);
    }
    async processScore(playerId, from, to) {
        const [attendance, training, exercise, discipline] = await Promise.all([
            this.prisma.attendanceRecord.findMany({
                where: { playerId, event: { date: { gte: from, lte: to } } },
            }),
            this.prisma.trainingLog.findMany({ where: { playerId, date: { gte: from, lte: to } } }),
            this.prisma.exerciseLog.findMany({ where: { playerId, date: { gte: from, lte: to } } }),
            this.prisma.disciplineScore.findMany({ where: { playerId, weekStart: { gte: from } } }),
        ]);
        const attScore = attendance.length
            ? (attendance.reduce((s, a) => s + ATTENDANCE_WEIGHT[a.status], 0) / attendance.length) * 100
            : 50;
        const weeks = 4;
        const trainingDays = new Set(training.map((t) => t.date.toISOString().slice(0, 10)));
        const daysPerWeek = trainingDays.size / weeks;
        const consistent = daysPerWeek >= 3 ? 1.1 : 1;
        const freqScore = clamp((daysPerWeek / 4) * 100 * consistent);
        const totalMin = training.reduce((s, t) => s + t.durationMin, 0);
        const volScore = clamp((totalMin / (300 * weeks)) * 100);
        const exDays = new Set(exercise.map((e) => e.date.toISOString().slice(0, 10)));
        const exScore = clamp((exDays.size / 28) * 100 * 1.4);
        const discScore = discipline.length
            ? (discipline.reduce((s, d) => s + d.overall, 0) / discipline.length) * 10
            : 50;
        const allDays = [...new Set([...trainingDays, ...exDays])].sort().reverse();
        let streak = 0;
        for (let i = 0; i < allDays.length; i++) {
            const gap = i === 0
                ? (0, date_fns_1.differenceInCalendarDays)(to, new Date(allDays[0]))
                : (0, date_fns_1.differenceInCalendarDays)(new Date(allDays[i - 1]), new Date(allDays[i]));
            if (gap <= 1)
                streak++;
            else
                break;
        }
        const streakScore = clamp((Math.min(streak, 30) / 30) * 100);
        return clamp(attScore * 0.2 + freqScore * 0.2 + volScore * 0.1 +
            exScore * 0.15 + discScore * 0.25 + streakScore * 0.1);
    }
    async performanceRaw(playerId, since) {
        const [batting, bowling, fielding] = await Promise.all([
            this.prisma.battingInnings.findMany({
                where: { playerId, innings: { match: { date: { gte: since } } } },
                include: { innings: { include: { match: true } } },
                orderBy: { innings: { match: { date: 'desc' } } },
            }),
            this.prisma.bowlingSpell.findMany({
                where: { playerId, innings: { match: { date: { gte: since } } } },
                include: { innings: { include: { match: true } } },
            }),
            this.prisma.fieldingEffort.findMany({
                where: { playerId, innings: { match: { date: { gte: since } } } },
            }),
        ]);
        const battingPts = batting.reduce((s, b, i) => {
            const sr = b.balls ? (b.runs / b.balls) * 100 : 0;
            const milestone = b.runs >= 100 ? 40 : b.runs >= 50 ? 20 : b.runs >= 30 ? 10 : 0;
            const base = b.runs + milestone + (sr > 120 ? 5 : 0) + (!b.isOut && b.runs > 0 ? 5 : 0);
            return s + base * (i < 5 ? 2 : 1);
        }, 0);
        const bowlingPts = bowling.reduce((s, b) => {
            const econ = b.balls ? (b.runs / b.balls) * 6 : 99;
            return s + b.wickets * 25 + b.maidens * 8 + (b.balls >= 12 && econ < 6 ? 10 : 0);
        }, 0);
        const fieldingPts = fielding.reduce((s, f) => s + f.catches * 10 + f.runOuts * 12 + f.stumpings * 12, 0);
        const impact = batting
            .filter((b) => b.innings.match.result === 'WON')
            .reduce((s, b) => s + b.runs, 0) +
            bowling
                .filter((b) => b.innings.match.result === 'WON')
                .reduce((s, b) => s + b.wickets * 25, 0);
        return { batting: battingPts, bowling: bowlingPts, fielding: fieldingPts, impact };
    }
    async improvementScore(playerId) {
        const snapshots = await this.prisma.rankingSnapshot.findMany({
            where: { playerId, period: client_1.RankingPeriod.WEEKLY },
            orderBy: { periodStart: 'desc' },
            take: 8,
        });
        if (snapshots.length < 2)
            return 50;
        const series = snapshots
            .reverse()
            .map((s) => s.processScore * 0.6 + s.performanceScore * 0.4);
        const n = series.length;
        const xMean = (n - 1) / 2;
        const yMean = series.reduce((a, b) => a + b, 0) / n;
        let num = 0;
        let den = 0;
        series.forEach((y, x) => {
            num += (x - xMean) * (y - yMean);
            den += (x - xMean) ** 2;
        });
        const slope = den ? num / den : 0;
        return clamp(100 / (1 + Math.exp(-slope / 2)));
    }
    async leaderboard(category, period = client_1.RankingPeriod.WEEKLY) {
        const latest = await this.prisma.rankingSnapshot.findFirst({
            where: { period }, orderBy: { periodStart: 'desc' },
        });
        if (!latest)
            return [];
        const snapshots = await this.prisma.rankingSnapshot.findMany({
            where: { period, periodStart: latest.periodStart },
            include: { player: true },
        });
        const key = {
            overall: (s) => s.overallRating,
            batsmen: (s) => s.battingScore,
            bowlers: (s) => s.bowlingScore,
            'all-rounders': (s) => Math.min(s.battingScore, s.bowlingScore),
            fielders: (s) => s.fieldingScore,
            'most-improved': (s) => s.improvementScore,
            process: (s) => s.processScore,
            performance: (s) => s.performanceScore,
        };
        const metric = key[category] ?? key.overall;
        const ratings = snapshots.map((s) => s.overallRating).sort((a, b) => a - b);
        const percentile = (r) => ratings.length > 1
            ? (ratings.filter((x) => x < r).length / (ratings.length - 1)) * 100
            : 100;
        return snapshots
            .sort((a, b) => metric(b) - metric(a))
            .map((s, i) => ({
            rank: i + 1,
            player: {
                id: s.player.id, name: s.player.name,
                photoUrl: s.player.photoUrl, playingRole: s.player.playingRole,
            },
            score: +metric(s).toFixed(1),
            overallRating: +s.overallRating.toFixed(1),
            percentile: +percentile(s.overallRating).toFixed(0),
            tier: (0, exports.tierFor)(s.overallRating * 0.6 + percentile(s.overallRating) * 0.4),
            movement: s.previousRank == null ? 'same'
                : s.previousRank > s.rank ? 'up'
                    : s.previousRank < s.rank ? 'down' : 'same',
        }));
    }
    async updateConfig(weights) {
        const sum = weights.processWeight + weights.performanceWeight + weights.improvementWeight;
        if (Math.abs(sum - 1) > 0.001)
            throw new Error('Weights must sum to 1');
        const config = await this.prisma.rankingConfig.upsert({
            where: { id: 'default' }, create: { id: 'default', ...weights }, update: weights,
        });
        await this.recompute();
        return config;
    }
};
exports.RankingService = RankingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RankingService.prototype, "nightly", null);
exports.RankingService = RankingService = RankingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], RankingService);
//# sourceMappingURL=ranking.service.js.map