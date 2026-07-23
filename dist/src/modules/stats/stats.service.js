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
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const oversStr = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
let StatsService = class StatsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async playerStats(playerId, since) {
        const dateFilter = since ? { innings: { match: { date: { gte: since } } } } : {};
        const [batting, bowling, fielding] = await Promise.all([
            this.prisma.battingInnings.findMany({
                where: { playerId, ...dateFilter },
                include: { innings: { include: { match: true } } },
                orderBy: { innings: { match: { date: 'desc' } } },
            }),
            this.prisma.bowlingSpell.findMany({
                where: { playerId, ...dateFilter },
                include: { innings: { select: { matchId: true } } },
            }),
            this.prisma.fieldingEffort.findMany({
                where: { playerId, ...dateFilter },
                include: { innings: { select: { matchId: true } } },
            }),
        ]);
        const matchesPlayed = new Set([
            ...batting.map((b) => b.innings.match.id),
            ...bowling.map((b) => b.innings.matchId),
            ...fielding.map((f) => f.innings.matchId),
        ]).size;
        const runs = batting.reduce((s, b) => s + b.runs, 0);
        const ballsFaced = batting.reduce((s, b) => s + b.balls, 0);
        const outs = batting.filter((b) => b.isOut).length;
        const notOuts = batting.length - outs;
        const wkts = bowling.reduce((s, b) => s + b.wickets, 0);
        const ballsBowled = bowling.reduce((s, b) => s + b.balls, 0);
        const runsConceded = bowling.reduce((s, b) => s + b.runs, 0);
        const byType = new Map();
        const byBowler = new Map();
        for (const b of batting.filter((x) => x.isOut)) {
            if (b.dismissalType)
                byType.set(b.dismissalType, (byType.get(b.dismissalType) ?? 0) + 1);
            if (b.dismissedBy)
                byBowler.set(b.dismissedBy, (byBowler.get(b.dismissedBy) ?? 0) + 1);
        }
        const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
        return {
            matches: matchesPlayed,
            batting: {
                innings: batting.length,
                runs,
                balls: ballsFaced,
                average: outs ? +(runs / outs).toFixed(2) : null,
                strikeRate: ballsFaced ? +((runs / ballsFaced) * 100).toFixed(2) : null,
                highestScore: Math.max(0, ...batting.map((b) => b.runs)),
                fours: batting.reduce((s, b) => s + b.fours, 0),
                sixes: batting.reduce((s, b) => s + b.sixes, 0),
                thirties: batting.filter((b) => b.runs >= 30 && b.runs < 50).length,
                fifties: batting.filter((b) => b.runs >= 50 && b.runs < 100).length,
                hundreds: batting.filter((b) => b.runs >= 100).length,
                ducks: batting.filter((b) => b.runs === 0 && b.isOut).length,
                notOuts,
            },
            bowling: {
                overs: oversStr(ballsBowled),
                wickets: wkts,
                runsConceded,
                economy: ballsBowled ? +((runsConceded / ballsBowled) * 6).toFixed(2) : null,
                average: wkts ? +(runsConceded / wkts).toFixed(2) : null,
                strikeRate: wkts ? +(ballsBowled / wkts).toFixed(2) : null,
                maidens: bowling.reduce((s, b) => s + b.maidens, 0),
            },
            fielding: {
                catches: fielding.reduce((s, f) => s + f.catches, 0),
                runOuts: fielding.reduce((s, f) => s + f.runOuts, 0),
                stumpings: fielding.reduce((s, f) => s + f.stumpings, 0),
            },
            dismissals: {
                mostCommon: top(byType),
                mostDismissedBy: top(byBowler),
                breakdown: Object.fromEntries(byType),
            },
            recentInnings: batting.slice(0, 10).map((b) => ({
                matchId: b.innings.match.id,
                matchTitle: b.innings.match.title,
                date: b.innings.match.date,
                runs: b.runs,
                balls: b.balls,
                isOut: b.isOut,
            })),
        };
    }
    async matchScorecard(matchId) {
        return this.prisma.match.findUniqueOrThrow({
            where: { id: matchId },
            include: {
                innings: {
                    orderBy: { number: 'asc' },
                    include: {
                        battingInnings: { include: { player: true }, orderBy: { battingOrder: 'asc' } },
                        bowlingSpells: { include: { player: true } },
                        fieldingEfforts: { include: { player: true } },
                    },
                },
            },
        });
    }
    async listMatches() {
        return this.prisma.match.findMany({
            orderBy: { date: 'desc' },
            include: { innings: { orderBy: { number: 'asc' } } },
        });
    }
    async teamSummary() {
        const matches = await this.prisma.match.findMany({ orderBy: { date: 'desc' } });
        const by = (r) => matches.filter((m) => m.result === r).length;
        const won = by('WON');
        const lost = by('LOST');
        const tied = by('TIED');
        const noResult = by('DRAW') + by('NO_RESULT') + matches.filter((m) => m.result == null).length;
        const decided = won + lost;
        return {
            played: matches.length,
            won,
            lost,
            tied,
            noResult,
            winPct: decided ? +((won / decided) * 100).toFixed(1) : 0,
            trend: [...matches]
                .reverse()
                .map((m) => ({ id: m.id, result: m.result, title: m.title, date: m.date })),
        };
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatsService);
//# sourceMappingURL=stats.service.js.map