"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentaryParserService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let CommentaryParserService = class CommentaryParserService {
    parse(raw) {
        const lines = raw
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const match = {
            title: 'Match',
            opponent: 'Opposition',
            venue: null,
            date: new Date(),
            overs: null,
            resultText: null,
            innings: [],
        };
        let current = null;
        for (const line of lines) {
            const header = line.match(/^Innings\s*(\d)\s*[:\-]\s*(.+)$/i);
            if (header) {
                current = { number: Number(header[1]), battingTeam: header[2].trim(), balls: [] };
                match.innings.push(current);
                continue;
            }
            const meta = line.match(/^(Match|Teams?)\s*[:\-]\s*(.+)$/i) ??
                line.match(/^(Date|Venue|Result|Overs)\s*[:\-]\s*(.+)$/i);
            if (meta && !current) {
                this.applyMeta(match, meta[1].toLowerCase(), meta[2].trim());
                continue;
            }
            const ball = current && this.parseBall(line);
            if (ball)
                current.balls.push(ball);
        }
        if (!match.innings.length) {
            throw new Error('No innings found. Expected "Innings 1: <team>" headers followed by ball-by-ball lines like "0.1 Bowler to Batter, 1 run".');
        }
        return match;
    }
    applyMeta(match, key, value) {
        switch (key) {
            case 'match':
            case 'team':
            case 'teams': {
                match.title = value;
                const vs = value.match(/(.+?)\s+vs\.?\s+(.+?)(?:,|$)/i);
                if (vs)
                    match.opponent = vs[2].trim();
                const ov = value.match(/(\d+)\s*overs?/i);
                if (ov)
                    match.overs = Number(ov[1]);
                break;
            }
            case 'date': {
                const parsed = new Date(value);
                if (!Number.isNaN(parsed.getTime()))
                    match.date = parsed;
                break;
            }
            case 'venue':
                match.venue = value;
                break;
            case 'result':
                match.resultText = value;
                break;
            case 'overs':
                match.overs = Number(value.match(/\d+/)?.[0] ?? '') || null;
                break;
        }
    }
    parseBall(line) {
        const head = line.match(/^(\d+)\.(\d+)\s+(.+?)\s+to\s+(.+?)\s*[,:\-]\s*(.+)$/i);
        if (!head)
            return null;
        const [, over, ballInOver, bowler, batter, rest] = head;
        const desc = rest.trim();
        const lower = desc.toLowerCase();
        const ball = {
            over: Number(over),
            ballInOver: Number(ballInOver),
            batter: batter.trim(),
            bowler: bowler.trim(),
            runsBat: 0,
            extras: 0,
            extraType: null,
            isFour: false,
            isSix: false,
            isWicket: false,
            dismissalType: null,
            dismissedBatter: null,
            fielder: null,
            raw: line,
        };
        const extra = lower.match(/\b(wide|no[\s-]?ball|leg[\s-]?bye|bye)s?\b/);
        if (extra) {
            const type = extra[1].replace(/\s/g, '-');
            ball.extraType = (type === 'noball' ? 'no-ball' : type);
            const extraRuns = lower.match(/(\d+)\s*(?:wide|no[\s-]?ball|leg[\s-]?bye|bye)/) ??
                lower.match(/(?:wide|no[\s-]?ball|leg[\s-]?bye|bye)s?\s*,?\s*(\d+)\s*runs?/);
            const n = extraRuns ? Number(extraRuns[1]) : 1;
            if (ball.extraType === 'wide' || ball.extraType === 'no-ball') {
                ball.extras = Math.max(n, 1);
            }
            else {
                ball.extras = n;
            }
        }
        if (/\bsix\b|\b6\s*runs?\b/i.test(lower) && !extra) {
            ball.runsBat = 6;
            ball.isSix = true;
        }
        else if (/\bfour\b|\b4\s*runs?\b/i.test(lower) && !/leg[\s-]?bye|bye/.test(lower)) {
            ball.runsBat = 4;
            ball.isFour = true;
        }
        else if (!extra || ball.extraType === 'no-ball') {
            const runs = lower.match(/\b(\d)\s*runs?\b/) ?? (/(^|\W)no\s*run/.test(lower) ? null : null);
            if (runs)
                ball.runsBat = Number(runs[1]);
            if (/\bsix\b/.test(lower)) {
                ball.runsBat = 6;
                ball.isSix = true;
            }
            else if (/\bfour\b/.test(lower)) {
                ball.runsBat = 4;
                ball.isFour = true;
            }
        }
        if (/\bout\b|\bwicket\b|\bbowled\b|\blbw\b|\bstumped\b|\brun\s*out\b|\bcaught\b/i.test(lower)) {
            this.parseWicket(ball, desc);
        }
        return ball;
    }
    parseWicket(ball, desc) {
        const lower = desc.toLowerCase();
        ball.isWicket = true;
        ball.dismissedBatter = ball.batter;
        const runOut = desc.match(/run\s*out\s*(?:\(([^)]+)\)|by\s+([A-Za-z .'-]+))/i);
        if (runOut) {
            ball.dismissalType = client_1.DismissalType.RUN_OUT;
            ball.fielder = (runOut[1] ?? runOut[2])?.trim() ?? null;
            const who = desc.match(/run\s*out[!.]?\s+([A-Z][A-Za-z .'-]+?)\s+(?:is\s+)?(?:run\s*out|short)/i);
            if (who)
                ball.dismissedBatter = who[1].trim();
            return;
        }
        if (/run\s*out/i.test(lower)) {
            ball.dismissalType = client_1.DismissalType.RUN_OUT;
            return;
        }
        const stumped = desc.match(/\bst\.?\s+([A-Za-z .'-]+?)\s+b\.?\s+[A-Za-z .'-]+/i);
        if (stumped || /stumped/i.test(lower)) {
            ball.dismissalType = client_1.DismissalType.STUMPED;
            ball.fielder = stumped?.[1]?.trim() ?? desc.match(/stumped\s+by\s+([A-Za-z .'-]+)/i)?.[1]?.trim() ?? null;
            return;
        }
        if (/c\s*&\s*b|caught\s+and\s+bowled/i.test(desc)) {
            ball.dismissalType = client_1.DismissalType.CAUGHT_AND_BOWLED;
            ball.fielder = ball.bowler;
            return;
        }
        const caught = desc.match(/\bc\.?\s+([A-Za-z .'-]+?)\s+b\.?\s+[A-Za-z .'-]+/i) ??
            desc.match(/caught\s+by\s+([A-Za-z .'-]+)/i);
        if (caught || /\bcaught\b/i.test(lower)) {
            ball.dismissalType = client_1.DismissalType.CAUGHT;
            ball.fielder = caught?.[1]?.trim() ?? null;
            return;
        }
        if (/\blbw\b/i.test(lower)) {
            ball.dismissalType = client_1.DismissalType.LBW;
            return;
        }
        if (/hit\s*wicket/i.test(lower)) {
            ball.dismissalType = client_1.DismissalType.HIT_WICKET;
            return;
        }
        if (/\bbowled\b|\bb\.?\s/i.test(lower)) {
            ball.dismissalType = client_1.DismissalType.BOWLED;
            return;
        }
        if (/retired/i.test(lower)) {
            ball.dismissalType = client_1.DismissalType.RETIRED;
            return;
        }
        ball.dismissalType = client_1.DismissalType.OTHER;
    }
};
exports.CommentaryParserService = CommentaryParserService;
exports.CommentaryParserService = CommentaryParserService = __decorate([
    (0, common_1.Injectable)()
], CommentaryParserService);
//# sourceMappingURL=commentary-parser.service.js.map