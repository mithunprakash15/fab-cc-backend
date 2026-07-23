import { Injectable } from '@nestjs/common';
import { DismissalType } from '@prisma/client';
import { ParsedBall, ParsedInnings, ParsedMatch } from './commentary-parser.service';

/**
 * Converts CricHeroes commentary JSON exports into the same `ParsedMatch` /
 * `ParsedBall` shape the text parser produces, so both feed the one ingestion
 * pipeline (which derives scorecards, stats and rankings from ball events).
 *
 * You pass one or two innings files; FAB CC is identified by a stable team id.
 */
@Injectable()
export class CricheroesParserService {
  /** FAB CC's CricHeroes team id — stable across matches. */
  static readonly FAB_TEAM_ID = Number(process.env.FAB_TEAM_ID ?? 7544665);

  /** @param roots parsed JSON objects (one per innings file). */
  parse(roots: any[]): ParsedMatch {
    const innings: (ParsedInnings & { totalRuns: number; totalWkts: number; teamId: number })[] = [];
    let overs: number | null = null;

    for (const root of roots) {
      const inn = this.parseInnings(root);
      if (!inn) continue;
      innings.push(inn);
      if (inn.quotaOvers) overs = Math.max(overs ?? 0, Math.round(inn.quotaOvers));
    }

    innings.sort((a, b) => a.number - b.number);

    const fab = CricheroesParserService.FAB_TEAM_ID;
    const nameFor = (teamId: number) => (teamId === fab ? 'FAB CC' : 'Opponent');

    // Result (needs both innings).
    let resultText: string | null = null;
    if (innings.length === 2) {
      const [a, b] = innings;
      if (b.totalRuns > a.totalRuns) {
        const w = 10 - b.totalWkts;
        resultText = `${nameFor(b.teamId)} won by ${w} wicket${w === 1 ? '' : 's'}`;
      } else if (b.totalRuns < a.totalRuns) {
        const m = a.totalRuns - b.totalRuns;
        resultText = `${nameFor(a.teamId)} won by ${m} run${m === 1 ? '' : 's'}`;
      } else {
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

  private parseInnings(
    root: any,
  ): (ParsedInnings & { totalRuns: number; totalWkts: number; teamId: number; quotaOvers?: number }) | null {
    const commentary = root?.data?.commentary;
    const ext = root?.data?.commentary_with_extended_summary ?? [];
    if (!Array.isArray(commentary) || commentary.length === 0) return null;

    const raw = [...commentary].sort((a, b) => a.ball_id - b.ball_id);
    const number = raw[0].inning;
    const teamId = raw[0].team_id;
    const battingTeam = teamId === CricheroesParserService.FAB_TEAM_ID ? 'FAB CC' : 'Opponent';

    // Scheduled overs from an over summary's remaining balls + a name→CricHeroes
    // id map (from over summaries + new-player cards) for exact player resolution.
    let quotaOvers: number | undefined;
    const nameToId = new Map<string, number>();
    const addId = (name: any, id: any) => {
      const n = String(name ?? '').trim();
      const i = Number(id);
      if (n && Number.isFinite(i) && i > 0) nameToId.set(n.toLowerCase(), i);
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
    const idFor = (name?: string | null) =>
      name ? nameToId.get(name.trim().toLowerCase()) : undefined;

    const balls: ParsedBall[] = [];
    let totalRuns = 0;
    let totalWkts = 0;

    for (const b of raw) {
      const code: string = b.extra_type_code ?? '';
      const run = Number(b.run) || 0;
      const extraRun = Number(b.extra_run) || 0;

      const extraType =
        code === 'WD' ? 'wide' : code === 'NB' ? 'no-ball' : code === 'B' ? 'bye' : code === 'LB' ? 'leg-bye' : null;
      const runsBat = code === '' || code === 'NB' ? run : 0;
      const extras =
        code === 'WD' ? 1 + extraRun : code === 'NB' ? 1 : code === 'B' || code === 'LB' ? extraRun : 0;

      totalRuns += runsBat + extras;

      const { bowler, batsman } = this.parseLine(b.commentary);
      const dismissalType = b.is_out ? this.mapDismissal(b.dismiss_type) : null;
      const out = b.is_out ? this.parseOutHow(b.out_how) : null;
      if (b.is_out && dismissalType !== 'RETIRED') totalWkts += 1;

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

  /** "Bowler to Batsman, rest" → names. */
  private parseLine(commentary: string): { bowler?: string; batsman?: string } {
    const m = String(commentary ?? '').match(/^(.*?)\s+to\s+(.*?),/);
    return m ? { bowler: m[1].trim(), batsman: m[2].trim() } : {};
  }

  /** Parse the dismissed batter + fielder out of an `out_how` line. */
  private parseOutHow(outHow: string): { batsman: string; fielder?: string } | null {
    const s = String(outHow ?? '').trim();
    const paren = s.match(/^(.*?)\s*\(\d+r\s+\d+b/i);
    if (!paren) return null;
    const head = paren[1].trim();
    const mode = head.match(/\s(c&b|c †|c|lbw|st|b|run out)\s/i);
    if (!mode || mode.index == null) return { batsman: head };
    const batsman = head.slice(0, mode.index).trim();
    const dismissal = head.slice(mode.index);
    const c = dismissal.match(/^\s*c(?:&b|\s*†?)\s*(.+?)\s+b\s+/i);
    const st = dismissal.match(/^\s*st\s*†?\s*(.+?)\s+b\s+/i);
    const fielder = (c?.[1] ?? st?.[1])?.replace(/^†/, '').trim();
    return { batsman, fielder };
  }

  private mapDismissal(type: string): DismissalType {
    const t = String(type ?? '').toLowerCase();
    if (t.includes('run out')) return DismissalType.RUN_OUT;
    if (t.includes('stump')) return DismissalType.STUMPED;
    if (t.includes('caught and bowled') || t.includes('c&b')) return DismissalType.CAUGHT_AND_BOWLED;
    if (t.includes('caught') || t.includes('catch')) return DismissalType.CAUGHT;
    if (t.includes('lbw')) return DismissalType.LBW;
    if (t.includes('bowled')) return DismissalType.BOWLED;
    if (t.includes('hit wicket')) return DismissalType.HIT_WICKET;
    if (t.includes('retired')) return DismissalType.RETIRED;
    return DismissalType.OTHER;
  }
}
