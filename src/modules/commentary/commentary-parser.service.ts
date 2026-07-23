import { Injectable } from '@nestjs/common';
import { DismissalType } from '@prisma/client';

export interface ParsedBall {
  over: number;
  ballInOver: number;
  batter: string;
  bowler: string;
  // CricHeroes numeric player ids, when the source provides them (JSON ingest).
  // Absent for text commentary — resolution falls back to name matching.
  batterId?: number;
  bowlerId?: number;
  fielderId?: number;
  dismissedBatterId?: number;
  runsBat: number;
  extras: number;
  extraType: 'wide' | 'no-ball' | 'bye' | 'leg-bye' | null;
  isFour: boolean;
  isSix: boolean;
  isWicket: boolean;
  dismissalType: DismissalType | null;
  dismissedBatter: string | null;
  fielder: string | null;
  raw: string;
}

export interface ParsedInnings {
  number: number;
  battingTeam: string;
  balls: ParsedBall[];
}

export interface ParsedMatch {
  title: string;
  opponent: string;
  venue: string | null;
  date: Date;
  overs: number | null;
  resultText: string | null;
  innings: ParsedInnings[];
}

/**
 * Parses CricHeroes-style match exports:
 *
 *   Match: FAB CC vs Thunder XI, 20 overs
 *   Date: 12 Jul 2026
 *   Venue: Marina Ground
 *   Result: FAB CC won by 24 runs
 *
 *   Innings 1: FAB CC
 *   0.1 Arjun to Vikram, no run
 *   0.2 Arjun to Vikram, FOUR! driven through covers
 *   0.3 Arjun to Vikram, wide
 *   4.5 Ravi to Suresh, OUT! c Manoj b Ravi
 *   ...
 *   Innings 2: Thunder XI
 *   ...
 */
@Injectable()
export class CommentaryParserService {
  parse(raw: string): ParsedMatch {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const match: ParsedMatch = {
      title: 'Match',
      opponent: 'Opposition',
      venue: null,
      date: new Date(),
      overs: null,
      resultText: null,
      innings: [],
    };

    let current: ParsedInnings | null = null;

    for (const line of lines) {
      const header = line.match(/^Innings\s*(\d)\s*[:\-]\s*(.+)$/i);
      if (header) {
        current = { number: Number(header[1]), battingTeam: header[2].trim(), balls: [] };
        match.innings.push(current);
        continue;
      }

      const meta =
        line.match(/^(Match|Teams?)\s*[:\-]\s*(.+)$/i) ??
        line.match(/^(Date|Venue|Result|Overs)\s*[:\-]\s*(.+)$/i);
      if (meta && !current) {
        this.applyMeta(match, meta[1].toLowerCase(), meta[2].trim());
        continue;
      }

      const ball = current && this.parseBall(line);
      if (ball) current!.balls.push(ball);
    }

    if (!match.innings.length) {
      throw new Error(
        'No innings found. Expected "Innings 1: <team>" headers followed by ball-by-ball lines like "0.1 Bowler to Batter, 1 run".',
      );
    }
    return match;
  }

  private applyMeta(match: ParsedMatch, key: string, value: string) {
    switch (key) {
      case 'match':
      case 'team':
      case 'teams': {
        match.title = value;
        const vs = value.match(/(.+?)\s+vs\.?\s+(.+?)(?:,|$)/i);
        if (vs) match.opponent = vs[2].trim();
        const ov = value.match(/(\d+)\s*overs?/i);
        if (ov) match.overs = Number(ov[1]);
        break;
      }
      case 'date': {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) match.date = parsed;
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

  /** "4.5 Ravi to Suresh, OUT! c Manoj b Ravi" → ParsedBall */
  private parseBall(line: string): ParsedBall | null {
    const head = line.match(/^(\d+)\.(\d+)\s+(.+?)\s+to\s+(.+?)\s*[,:\-]\s*(.+)$/i);
    if (!head) return null;

    const [, over, ballInOver, bowler, batter, rest] = head;
    const desc = rest.trim();
    const lower = desc.toLowerCase();

    const ball: ParsedBall = {
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

    // Extras — CricHeroes counts wides/no-balls as 1 + runs off the delivery.
    const extra = lower.match(/\b(wide|no[\s-]?ball|leg[\s-]?bye|bye)s?\b/);
    if (extra) {
      const type = extra[1].replace(/\s/g, '-');
      ball.extraType = (type === 'noball' ? 'no-ball' : type) as ParsedBall['extraType'];
      const extraRuns = lower.match(/(\d+)\s*(?:wide|no[\s-]?ball|leg[\s-]?bye|bye)/) ??
        lower.match(/(?:wide|no[\s-]?ball|leg[\s-]?bye|bye)s?\s*,?\s*(\d+)\s*runs?/);
      const n = extraRuns ? Number(extraRuns[1]) : 1;
      if (ball.extraType === 'wide' || ball.extraType === 'no-ball') {
        ball.extras = Math.max(n, 1);
      } else {
        ball.extras = n; // byes/leg-byes
      }
    }

    // Runs off the bat
    if (/\bsix\b|\b6\s*runs?\b/i.test(lower) && !extra) {
      ball.runsBat = 6;
      ball.isSix = true;
    } else if (/\bfour\b|\b4\s*runs?\b/i.test(lower) && !/leg[\s-]?bye|bye/.test(lower)) {
      ball.runsBat = 4;
      ball.isFour = true;
    } else if (!extra || ball.extraType === 'no-ball') {
      const runs = lower.match(/\b(\d)\s*runs?\b/) ?? (/(^|\W)no\s*run/.test(lower) ? null : null);
      if (runs) ball.runsBat = Number(runs[1]);
      if (/\bsix\b/.test(lower)) {
        ball.runsBat = 6;
        ball.isSix = true;
      } else if (/\bfour\b/.test(lower)) {
        ball.runsBat = 4;
        ball.isFour = true;
      }
    }

    // Wickets
    if (/\bout\b|\bwicket\b|\bbowled\b|\blbw\b|\bstumped\b|\brun\s*out\b|\bcaught\b/i.test(lower)) {
      this.parseWicket(ball, desc);
    }

    return ball;
  }

  private parseWicket(ball: ParsedBall, desc: string) {
    const lower = desc.toLowerCase();
    ball.isWicket = true;
    ball.dismissedBatter = ball.batter; // default; run-outs may name someone else

    // "run out (Fielder)" or "run out by Fielder"
    const runOut = desc.match(/run\s*out\s*(?:\(([^)]+)\)|by\s+([A-Za-z .'-]+))/i);
    if (runOut) {
      ball.dismissalType = DismissalType.RUN_OUT;
      ball.fielder = (runOut[1] ?? runOut[2])?.trim() ?? null;
      const who = desc.match(/run\s*out[!.]?\s+([A-Z][A-Za-z .'-]+?)\s+(?:is\s+)?(?:run\s*out|short)/i);
      if (who) ball.dismissedBatter = who[1].trim();
      return;
    }
    if (/run\s*out/i.test(lower)) {
      ball.dismissalType = DismissalType.RUN_OUT;
      return;
    }

    // "st Keeper b Bowler"
    const stumped = desc.match(/\bst\.?\s+([A-Za-z .'-]+?)\s+b\.?\s+[A-Za-z .'-]+/i);
    if (stumped || /stumped/i.test(lower)) {
      ball.dismissalType = DismissalType.STUMPED;
      ball.fielder = stumped?.[1]?.trim() ?? desc.match(/stumped\s+by\s+([A-Za-z .'-]+)/i)?.[1]?.trim() ?? null;
      return;
    }

    // "c & b" / "c Fielder b Bowler"
    if (/c\s*&\s*b|caught\s+and\s+bowled/i.test(desc)) {
      ball.dismissalType = DismissalType.CAUGHT_AND_BOWLED;
      ball.fielder = ball.bowler;
      return;
    }
    const caught = desc.match(/\bc\.?\s+([A-Za-z .'-]+?)\s+b\.?\s+[A-Za-z .'-]+/i) ??
      desc.match(/caught\s+by\s+([A-Za-z .'-]+)/i);
    if (caught || /\bcaught\b/i.test(lower)) {
      ball.dismissalType = DismissalType.CAUGHT;
      ball.fielder = caught?.[1]?.trim() ?? null;
      return;
    }

    if (/\blbw\b/i.test(lower)) {
      ball.dismissalType = DismissalType.LBW;
      return;
    }
    if (/hit\s*wicket/i.test(lower)) {
      ball.dismissalType = DismissalType.HIT_WICKET;
      return;
    }
    if (/\bbowled\b|\bb\.?\s/i.test(lower)) {
      ball.dismissalType = DismissalType.BOWLED;
      return;
    }
    if (/retired/i.test(lower)) {
      ball.dismissalType = DismissalType.RETIRED;
      return;
    }
    ball.dismissalType = DismissalType.OTHER;
  }
}
