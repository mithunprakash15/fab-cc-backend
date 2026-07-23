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
exports.StatsEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let StatsEngineService = class StatsEngineService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async buildScorecards(matchId) {
        const innings = await this.prisma.innings.findMany({
            where: { matchId },
            include: { balls: { orderBy: [{ over: 'asc' }, { ballInOver: 'asc' }] } },
        });
        for (const inn of innings) {
            await this.prisma.$transaction([
                this.prisma.battingInnings.deleteMany({ where: { inningsId: inn.id } }),
                this.prisma.bowlingSpell.deleteMany({ where: { inningsId: inn.id } }),
                this.prisma.fieldingEffort.deleteMany({ where: { inningsId: inn.id } }),
            ]);
            const batting = new Map();
            const bowling = new Map();
            const fielding = new Map();
            let totalRuns = 0;
            let totalWickets = 0;
            let legalBalls = 0;
            let order = 0;
            const overTally = new Map();
            for (const b of inn.balls) {
                totalRuns += b.runsBat + b.extras;
                const isLegal = b.extraType !== 'wide' && b.extraType !== 'no-ball';
                if (isLegal)
                    legalBalls++;
                if (!batting.has(b.batterName)) {
                    batting.set(b.batterName, {
                        name: b.batterName, runs: 0, balls: 0, fours: 0, sixes: 0,
                        isOut: false, dismissalType: null, dismissedBy: null, battingOrder: order++,
                    });
                }
                const bat = batting.get(b.batterName);
                bat.runs += b.runsBat;
                if (b.extraType !== 'wide')
                    bat.balls++;
                if (b.isFour)
                    bat.fours++;
                if (b.isSix)
                    bat.sixes++;
                if (!bowling.has(b.bowlerName)) {
                    bowling.set(b.bowlerName, {
                        name: b.bowlerName, balls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0,
                    });
                }
                const bowl = bowling.get(b.bowlerName);
                if (isLegal)
                    bowl.balls++;
                const bowlerRuns = b.runsBat + (b.extraType === 'wide' || b.extraType === 'no-ball' ? b.extras : 0);
                bowl.runs += bowlerRuns;
                if (b.extraType === 'wide')
                    bowl.wides++;
                if (b.extraType === 'no-ball')
                    bowl.noBalls++;
                if (!overTally.has(b.bowlerName))
                    overTally.set(b.bowlerName, new Map());
                const ov = overTally.get(b.bowlerName);
                if (!ov.has(b.over))
                    ov.set(b.over, { runs: 0, balls: 0 });
                ov.get(b.over).runs += bowlerRuns;
                if (isLegal)
                    ov.get(b.over).balls++;
                if (b.isWicket && b.dismissalType !== 'RETIRED') {
                    totalWickets++;
                    const outBall = await this.prisma.ballEvent.findUnique({
                        where: { id: b.id }, include: { dismissed: true },
                    });
                    const outName = outBall?.dismissed?.name ?? b.batterName;
                    if (!batting.has(outName)) {
                        batting.set(outName, {
                            name: outName, runs: 0, balls: 0, fours: 0, sixes: 0,
                            isOut: false, dismissalType: null, dismissedBy: null, battingOrder: order++,
                        });
                    }
                    const out = batting.get(outName);
                    out.isOut = true;
                    out.dismissalType = b.dismissalType;
                    if (b.dismissalType !== 'RUN_OUT') {
                        bowl.wickets++;
                        out.dismissedBy = b.bowlerName;
                    }
                    if (b.fielderName) {
                        if (!fielding.has(b.fielderName)) {
                            fielding.set(b.fielderName, { name: b.fielderName, catches: 0, runOuts: 0, stumpings: 0 });
                        }
                        const f = fielding.get(b.fielderName);
                        if (b.dismissalType === 'CAUGHT' || b.dismissalType === 'CAUGHT_AND_BOWLED')
                            f.catches++;
                        if (b.dismissalType === 'RUN_OUT')
                            f.runOuts++;
                        if (b.dismissalType === 'STUMPED')
                            f.stumpings++;
                    }
                }
            }
            for (const [bowler, overs] of overTally) {
                const spell = bowling.get(bowler);
                for (const o of overs.values())
                    if (o.balls === 6 && o.runs === 0)
                        spell.maidens++;
            }
            const byName = async (name) => this.prisma.player.findUnique({ where: { normalizedName: name.toLowerCase() } });
            for (const bat of batting.values()) {
                const player = await byName(bat.name);
                if (!player)
                    continue;
                await this.prisma.battingInnings.create({
                    data: {
                        playerId: player.id, inningsId: inn.id, runs: bat.runs, balls: bat.balls,
                        fours: bat.fours, sixes: bat.sixes, isOut: bat.isOut,
                        dismissalType: bat.dismissalType, dismissedBy: bat.dismissedBy,
                        battingOrder: bat.battingOrder,
                    },
                });
            }
            for (const bowl of bowling.values()) {
                const player = await byName(bowl.name);
                if (!player)
                    continue;
                await this.prisma.bowlingSpell.create({
                    data: {
                        playerId: player.id, inningsId: inn.id, balls: bowl.balls, runs: bowl.runs,
                        wickets: bowl.wickets, maidens: bowl.maidens, wides: bowl.wides, noBalls: bowl.noBalls,
                    },
                });
            }
            for (const f of fielding.values()) {
                const player = await byName(f.name);
                if (!player)
                    continue;
                await this.prisma.fieldingEffort.create({
                    data: {
                        playerId: player.id, inningsId: inn.id,
                        catches: f.catches, runOuts: f.runOuts, stumpings: f.stumpings,
                    },
                });
            }
            await this.prisma.innings.update({
                where: { id: inn.id },
                data: {
                    totalRuns, totalWickets,
                    totalOvers: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`,
                },
            });
        }
    }
};
exports.StatsEngineService = StatsEngineService;
exports.StatsEngineService = StatsEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatsEngineService);
//# sourceMappingURL=stats-engine.service.js.map