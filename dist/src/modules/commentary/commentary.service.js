"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommentaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentaryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
const commentary_parser_service_1 = require("./commentary-parser.service");
const cricheroes_parser_service_1 = require("./cricheroes-parser.service");
const stats_engine_service_1 = require("../stats/stats-engine.service");
const ranking_service_1 = require("../ranking/ranking.service");
const CLUB_NAME = 'FAB CC';
let CommentaryService = CommentaryService_1 = class CommentaryService {
    prisma;
    parser;
    cricheroes;
    statsEngine;
    ranking;
    logger = new common_1.Logger(CommentaryService_1.name);
    constructor(prisma, parser, cricheroes, statsEngine, ranking) {
        this.prisma = prisma;
        this.parser = parser;
        this.cricheroes = cricheroes;
        this.statsEngine = statsEngine;
        this.ranking = ranking;
    }
    async ingest(raw) {
        const parsed = this.parser.parse(raw);
        return this.persist(parsed, raw);
    }
    async ingestJson(files) {
        const roots = files.map((f) => JSON.parse(f));
        const parsed = this.cricheroes.parse(roots);
        if (!parsed.innings.length) {
            throw new Error('No innings found in the uploaded files.');
        }
        return this.persist(parsed, JSON.stringify(roots).slice(0, 1_000_000));
    }
    async persist(parsed, raw) {
        const keyOf = (name, chId) => chId != null ? `id:${chId}` : `nm:${name.trim().toLowerCase()}`;
        const participants = new Map();
        const add = (name, chId, isFab) => {
            if (!name)
                return;
            const key = keyOf(name, chId);
            const prev = participants.get(key);
            participants.set(key, { name, chId, isFab: (prev?.isFab ?? false) || isFab });
        };
        for (const inn of parsed.innings) {
            const fabBatting = inn.battingTeam === CLUB_NAME;
            for (const b of inn.balls) {
                add(b.batter, b.batterId, fabBatting);
                add(b.dismissedBatter, b.dismissedBatterId, fabBatting);
                add(b.bowler, b.bowlerId, !fabBatting);
                add(b.fielder, b.fielderId, !fabBatting);
            }
        }
        const resolved = new Map();
        for (const [key, p] of participants) {
            if (!p.isFab)
                continue;
            const player = await this.resolvePlayer(this.prisma, p.name, p.chId);
            await this.ensurePlayerLogin(player);
            resolved.set(key, { id: player.id, name: player.name });
        }
        const match = await this.prisma.$transaction(async (tx) => {
            const match = await tx.match.create({
                data: {
                    title: parsed.title,
                    opponent: parsed.opponent,
                    venue: parsed.venue,
                    date: parsed.date,
                    overs: parsed.overs,
                    resultText: parsed.resultText,
                    result: this.inferResult(parsed),
                    rawCommentary: raw,
                },
            });
            for (const inn of parsed.innings) {
                const innings = await tx.innings.create({
                    data: { matchId: match.id, number: inn.number, battingTeam: inn.battingTeam },
                });
                await tx.ballEvent.createMany({
                    data: inn.balls.map((b) => {
                        const batter = resolved.get(keyOf(b.batter, b.batterId));
                        const bowler = resolved.get(keyOf(b.bowler, b.bowlerId));
                        const fielder = b.fielder ? resolved.get(keyOf(b.fielder, b.fielderId)) : undefined;
                        const dismissed = b.dismissedBatter
                            ? resolved.get(keyOf(b.dismissedBatter, b.dismissedBatterId))
                            : undefined;
                        return {
                            inningsId: innings.id,
                            over: b.over,
                            ballInOver: b.ballInOver,
                            batterName: batter?.name ?? b.batter,
                            bowlerName: bowler?.name ?? b.bowler,
                            runsBat: b.runsBat,
                            extras: b.extras,
                            extraType: b.extraType,
                            isFour: b.isFour,
                            isSix: b.isSix,
                            isWicket: b.isWicket,
                            dismissalType: b.dismissalType,
                            dismissedId: dismissed?.id ?? null,
                            fielderName: fielder?.name ?? b.fielder ?? null,
                            commentary: b.raw,
                        };
                    }),
                });
            }
            return match;
        }, { timeout: 120_000 });
        await this.statsEngine.buildScorecards(match.id);
        await this.ranking.recompute();
        this.logger.log(`Ingested match ${match.id}: ${match.title}`);
        return this.prisma.match.findUniqueOrThrow({
            where: { id: match.id },
            include: {
                innings: {
                    include: {
                        battingInnings: { include: { player: true }, orderBy: { battingOrder: 'asc' } },
                        bowlingSpells: { include: { player: true } },
                    },
                },
            },
        });
    }
    async resolvePlayer(tx, name, cricheroesId) {
        const clean = name.replace(/\s+/g, ' ').trim();
        const normalized = clean.toLowerCase();
        if (cricheroesId != null) {
            const byId = await tx.player.findUnique({ where: { cricheroesId } });
            if (byId)
                return byId;
            const byName = await tx.player.findUnique({ where: { normalizedName: normalized } });
            if (byName) {
                if (byName.cricheroesId == null) {
                    return tx.player.update({ where: { id: byName.id }, data: { cricheroesId } });
                }
                return tx.player.create({
                    data: { name: clean, normalizedName: `${normalized}#${cricheroesId}`, cricheroesId, autoCreated: true },
                });
            }
            return tx.player.create({
                data: { name: clean, normalizedName: normalized, cricheroesId, autoCreated: true },
            });
        }
        let player = await tx.player.findUnique({ where: { normalizedName: normalized } });
        if (player)
            return player;
        const candidates = await tx.player.findMany({ select: { id: true, normalizedName: true } });
        const parts = normalized.split(' ');
        const fuzzy = candidates.find((c) => {
            const cp = c.normalizedName.split(' ');
            return (c.normalizedName.includes(normalized) ||
                normalized.includes(c.normalizedName) ||
                (parts.length > 1 && cp.length > 1 && parts[parts.length - 1] === cp[cp.length - 1] && parts[0][0] === cp[0][0]));
        });
        if (fuzzy)
            return tx.player.findUnique({ where: { id: fuzzy.id } });
        player = await tx.player.create({
            data: { name: clean, normalizedName: normalized, autoCreated: true },
        });
        this.logger.log(`Auto-created player "${clean}" from commentary`);
        return player;
    }
    async ensurePlayerLogin(player) {
        if (player.userId)
            return;
        const email = await this.uniquePlayerEmail(player.name);
        const password = process.env.PLAYER_DEFAULT_PASSWORD ?? '123';
        const user = await this.prisma.user.create({
            data: { email, passwordHash: await bcrypt.hash(password, 12), role: 'PLAYER' },
        });
        await this.prisma.player.update({ where: { id: player.id }, data: { userId: user.id } });
        this.logger.log(`Created login ${email} for player "${player.name}"`);
    }
    async uniquePlayerEmail(name) {
        const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '') || 'player';
        let email = `${base}@fabcc.club`;
        let n = 1;
        while (await this.prisma.user.findUnique({ where: { email } })) {
            email = `${base}${n++}@fabcc.club`;
        }
        return email;
    }
    inferResult(parsed) {
        const text = parsed.resultText?.toLowerCase();
        if (!text)
            return null;
        const club = CLUB_NAME.toLowerCase();
        if (text.includes('tie'))
            return client_1.MatchResult.TIED;
        if (text.includes('no result') || text.includes('abandon'))
            return client_1.MatchResult.NO_RESULT;
        if (text.includes(club) && text.includes('won'))
            return client_1.MatchResult.WON;
        if (text.includes('won'))
            return client_1.MatchResult.LOST;
        return null;
    }
};
exports.CommentaryService = CommentaryService;
exports.CommentaryService = CommentaryService = CommentaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        commentary_parser_service_1.CommentaryParserService,
        cricheroes_parser_service_1.CricheroesParserService,
        stats_engine_service_1.StatsEngineService,
        ranking_service_1.RankingService])
], CommentaryService);
//# sourceMappingURL=commentary.service.js.map