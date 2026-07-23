"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CricheroesParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CricheroesParserService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let CricheroesParserService = class CricheroesParserService {
    static { CricheroesParserService_1 = this; }
    static FAB_TEAM_ID = Number(process.env.FAB_TEAM_ID ?? 7544665);
    parse(roots) {
        const innings = [];
        let overs = null;
        for (const root of roots) {
            const inn = this.parseInnings(root);
            if (!inn)
                continue;
            innings.push(inn);
            if (inn.quotaOvers)
                overs = Math.max(overs ?? 0, Math.round(inn.quotaOvers));
        }
        innings.sort((a, b) => a.number - b.number);
        const fab = CricheroesParserService_1.FAB_TEAM_ID;
        const nameFor = (teamId) => (teamId === fab ? 'FAB CC' : 'Opponent');
        let resultText = null;
        if (innings.length === 2) {
            const [a, b] = innings;
            if (b.totalRuns > a.totalRuns) {
                const w = 10 - b.totalWkts;
                resultText = `${nameFor(b.teamId)} won by ${w} wicket${w === 1 ? '' : 's'}`;
            }
            else if (b.totalRuns < a.totalRuns) {
                const m = a.totalRuns - b.totalRuns;
                resultText = `${nameFor(a.teamId)} won by ${m} run${m === 1 ? '' : 's'}`;
            }
            else {
                resultText = 'Match tied';
            }
        }
        const opponentInn = innings.find((i) => i.teamId !== fab);
        return {
            title: `FAB CC vs ${opponentInn ? 'Opponent' : 'Opponent'}`,
            opponent: 'Opponent',
            venue: null,
            date: new Date(),
            overs,
            resultText,
            innings: innings.map((i) => ({ number: i.number, battingTeam: i.battingTeam, balls: i.balls })),
        };
    }
    parseInnings(root) {
        const commentary = root?.data?.commentary;
        const ext = root?.data?.commentary_with_extended_summary ?? [];
        if (!Array.isArray(commentary) || commentary.length === 0)
            return null;
        const raw = [...commentary].sort((a, b) => a.ball_id - b.ball_id);
        const number = raw[0].inning;
        const teamId = raw[0].team_id;
        const battingTeam = teamId === CricheroesParserService_1.FAB_TEAM_ID ? 'FAB CC' : 'Opponent';
        let quotaOvers;
        const nameToId = new Map();
        const addId = (name, id) => {
            const n = String(name ?? '').trim();
            const i = Number(id);
            if (n && Number.isFinite(i) && i > 0)
                nameToId.set(n.toLowerCase(), i);
        };
        for (const e of ext) {
            if (e?.type === 'over' && e.data) {
                const d = e.data;
                if (d.summary_data?.remaining_ball != null) {
                    quotaOvers = Number(d.over) + Number(d.summary_data.remaining_ball) / 6;
                }
                addId(d.batsman1_name, d.batsman1_id);
                addId(d.batsman2_name, d.batsman2_id);
                addId(d.bowler1_name, d.bowler1_id);
                addId(d.bowler2_name, d.bowler2_id);
            }
            if (e?.type === 'new_player' && e.data?.player_info) {
                addId(e.data.player_info.player_name, e.data.player_info.player_id);
            }
        }
        const idFor = (name) => name ? nameToId.get(name.trim().toLowerCase()) : undefined;
        const balls = [];
        let totalRuns = 0;
        let totalWkts = 0;
        for (const b of raw) {
            const code = b.extra_type_code ?? '';
            const run = Number(b.run) || 0;
            const extraRun = Number(b.extra_run) || 0;
            const extraType = code === 'WD' ? 'wide' : code === 'NB' ? 'no-ball' : code === 'B' ? 'bye' : code === 'LB' ? 'leg-bye' : null;
            const runsBat = code === '' || code === 'NB' ? run : 0;
            const extras = code === 'WD' ? 1 + extraRun : code === 'NB' ? 1 : code === 'B' || code === 'LB' ? extraRun : 0;
            totalRuns += runsBat + extras;
            const { bowler, batsman } = this.parseLine(b.commentary);
            const dismissalType = b.is_out ? this.mapDismissal(b.dismiss_type) : null;
            const out = b.is_out ? this.parseOutHow(b.out_how) : null;
            if (b.is_out && dismissalType !== 'RETIRED')
                totalWkts += 1;
            const [ov, bio] = String(b.ball ?? '0.0').split('.');
            const batterName = (out?.batsman ?? batsman ?? 'Unknown').trim();
            const bowlerName = (bowler ?? 'Unknown').trim();
            const dismissedName = out?.batsman ?? batsman ?? null;
            const dismissId = Number(b.dismiss_player_id);
            balls.push({
                over: parseInt(ov, 10) || 0,
                ballInOver: parseInt(bio ?? '0', 10) || 0,
                batter: batterName,
                bowler: bowlerName,
                batterId: idFor(batterName),
                bowlerId: idFor(bowlerName),
                fielderId: idFor(out?.fielder),
                dismissedBatterId: dismissId > 0 ? dismissId : idFor(dismissedName),
                runsBat,
                extras,
                extraType,
                isFour: !!b.is_boundry && run === 4,
                isSix: !!b.is_boundry && run === 6,
                isWicket: !!b.is_out,
                dismissalType,
                dismissedBatter: dismissedName,
                fielder: out?.fielder ?? null,
                raw: b.commentary ?? '',
            });
        }
        return { number, battingTeam, balls, totalRuns, totalWkts, teamId, quotaOvers };
    }
    parseLine(commentary) {
        const m = String(commentary ?? '').match(/^(.*?)\s+to\s+(.*?),/);
        return m ? { bowler: m[1].trim(), batsman: m[2].trim() } : {};
    }
    parseOutHow(outHow) {
        const s = String(outHow ?? '').trim();
        const paren = s.match(/^(.*?)\s*\(\d+r\s+\d+b/i);
        if (!paren)
            return null;
        const head = paren[1].trim();
        const mode = head.match(/\s(c&b|c †|c|lbw|st|b|run out)\s/i);
        if (!mode || mode.index == null)
            return { batsman: head };
        const batsman = head.slice(0, mode.index).trim();
        const dismissal = head.slice(mode.index);
        const c = dismissal.match(/^\s*c(?:&b|\s*†?)\s*(.+?)\s+b\s+/i);
        const st = dismissal.match(/^\s*st\s*†?\s*(.+?)\s+b\s+/i);
        const fielder = (c?.[1] ?? st?.[1])?.replace(/^†/, '').trim();
        return { batsman, fielder };
    }
    mapDismissal(type) {
        const t = String(type ?? '').toLowerCase();
        if (t.includes('run out'))
            return client_1.DismissalType.RUN_OUT;
        if (t.includes('stump'))
            return client_1.DismissalType.STUMPED;
        if (t.includes('caught and bowled') || t.includes('c&b'))
            return client_1.DismissalType.CAUGHT_AND_BOWLED;
        if (t.includes('caught') || t.includes('catch'))
            return client_1.DismissalType.CAUGHT;
        if (t.includes('lbw'))
            return client_1.DismissalType.LBW;
        if (t.includes('bowled'))
            return client_1.DismissalType.BOWLED;
        if (t.includes('hit wicket'))
            return client_1.DismissalType.HIT_WICKET;
        if (t.includes('retired'))
            return client_1.DismissalType.RETIRED;
        return client_1.DismissalType.OTHER;
    }
};
exports.CricheroesParserService = CricheroesParserService;
exports.CricheroesParserService = CricheroesParserService = CricheroesParserService_1 = __decorate([
    (0, common_1.Injectable)()
], CricheroesParserService);
//# sourceMappingURL=cricheroes-parser.service.js.map