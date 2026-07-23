import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const oversStr = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /** Full career + season statistics for a player, incl. dismissal analysis. */
  async playerStats(playerId: string, since?: Date) {
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

    // Matches played = any match the player batted, bowled OR fielded in.
    const matchesPlayed = new Set<string>([
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

    // Dismissal analysis
    const byType = new Map<string, number>();
    const byBowler = new Map<string, number>();
    for (const b of batting.filter((x) => x.isOut)) {
      if (b.dismissalType) byType.set(b.dismissalType, (byType.get(b.dismissalType) ?? 0) + 1);
      if (b.dismissedBy) byBowler.set(b.dismissedBy, (byBowler.get(b.dismissedBy) ?? 0) + 1);
    }
    const top = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

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

  /**
   * Deep, self-analysis analytics computed entirely from real match data:
   *  - Batting: scoring by batting position, batting-first vs chasing splits,
   *    and a recent-form list.
   *  - Bowling: over-by-over profile (runs/wickets/economy per over of the
   *    innings), the most runs conceded in a single over, the over in which the
   *    player takes the most wickets, and recent spells.
   */
  async playerAnalytics(playerId: string, since?: Date) {
    const player = await this.prisma.player.findUniqueOrThrow({ where: { id: playerId } });
    const dateFilter = since ? { innings: { match: { date: { gte: since } } } } : {};

    const [batting, spells, balls, batterBalls] = await Promise.all([
      this.prisma.battingInnings.findMany({
        where: { playerId, ...dateFilter },
        include: { innings: { include: { match: true } } },
        orderBy: { innings: { match: { date: 'desc' } } },
      }),
      this.prisma.bowlingSpell.findMany({
        where: { playerId, ...dateFilter },
        include: { innings: { include: { match: true } } },
        orderBy: { innings: { match: { date: 'desc' } } },
      }),
      // BallEvents store the raw commentary bowler name; normalizedName is that
      // name lower-cased, so an insensitive match reunites them.
      this.prisma.ballEvent.findMany({
        where: {
          bowlerName: { equals: player.normalizedName, mode: 'insensitive' },
          ...(since ? { innings: { match: { date: { gte: since } } } } : {}),
        },
        include: { innings: { include: { match: true } } },
      }),
      // Deliveries this player faced — for the batting scoring breakdown.
      this.prisma.ballEvent.findMany({
        where: {
          batterName: { equals: player.normalizedName, mode: 'insensitive' },
          ...(since ? { innings: { match: { date: { gte: since } } } } : {}),
        },
      }),
    ]);

    // ── Batting by position ──────────────────────────────────────────────────
    const orderMap = new Map<number, { innings: number; runs: number; balls: number; outs: number }>();
    for (const b of batting) {
      const pos = b.battingOrder + 1;
      const e = orderMap.get(pos) ?? { innings: 0, runs: 0, balls: 0, outs: 0 };
      e.innings++;
      e.runs += b.runs;
      e.balls += b.balls;
      if (b.isOut) e.outs++;
      orderMap.set(pos, e);
    }
    const byOrder = [...orderMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([position, e]) => ({
        position,
        innings: e.innings,
        runs: e.runs,
        balls: e.balls,
        average: e.outs ? +(e.runs / e.outs).toFixed(1) : null,
        strikeRate: e.balls ? +((e.runs / e.balls) * 100).toFixed(1) : null,
      }));

    // ── Batting first (innings 1) vs chasing (innings 2) ─────────────────────
    const split = (num: number) => {
      const rows = batting.filter((b) => b.innings.number === num);
      const runs = rows.reduce((s, b) => s + b.runs, 0);
      const ballsF = rows.reduce((s, b) => s + b.balls, 0);
      const outs = rows.filter((b) => b.isOut).length;
      return {
        innings: rows.length,
        runs,
        average: outs ? +(runs / outs).toFixed(1) : null,
        strikeRate: ballsF ? +((runs / ballsF) * 100).toFixed(1) : null,
      };
    };

    const recentBatting = batting.slice(0, 8).map((b) => ({
      runs: b.runs,
      balls: b.balls,
      isOut: b.isOut,
      strikeRate: b.balls ? +((b.runs / b.balls) * 100).toFixed(0) : 0,
      opponent: b.innings.match.opponent,
      date: b.innings.match.date,
    }));

    // ── Batting: scoring breakdown (dots / 1s / 2s / 3s / 4s / 6s) ────────────
    const bat = { dots: 0, ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, faced: 0, runs: 0 };
    for (const b of batterBalls) {
      if (b.extraType === 'wide') continue; // a wide is not a ball faced
      bat.faced++;
      bat.runs += b.runsBat;
      if (b.isSix) bat.sixes++;
      else if (b.isFour) bat.fours++;
      else if (b.runsBat === 0) bat.dots++;
      else if (b.runsBat === 1) bat.ones++;
      else if (b.runsBat === 2) bat.twos++;
      else if (b.runsBat >= 3) bat.threes++;
    }
    const battingScoring = {
      dots: bat.dots,
      ones: bat.ones,
      twos: bat.twos,
      threes: bat.threes,
      fours: bat.fours,
      sixes: bat.sixes,
      ballsFaced: bat.faced,
      dotPct: bat.faced ? +((bat.dots / bat.faced) * 100).toFixed(1) : null,
      boundaryRunPct: bat.runs ? +(((bat.fours * 4 + bat.sixes * 6) / bat.runs) * 100).toFixed(1) : null,
      scoringShotPct: bat.faced ? +(((bat.faced - bat.dots) / bat.faced) * 100).toFixed(1) : null,
    };

    // ── Bowling: over-by-over from ball events ───────────────────────────────
    const overMap = new Map<number, { balls: number; runs: number; wickets: number }>();
    const singleOver = new Map<string, { runs: number; over: number; opponent: string; date: Date }>();
    for (const b of balls) {
      const legal = b.extraType !== 'wide' && b.extraType !== 'no-ball';
      const conceded =
        b.runsBat + (b.extraType === 'wide' || b.extraType === 'no-ball' ? b.extras : 0);
      const e = overMap.get(b.over) ?? { balls: 0, runs: 0, wickets: 0 };
      if (legal) e.balls++;
      e.runs += conceded;
      if (b.isWicket && b.dismissalType !== 'RUN_OUT' && b.dismissalType !== 'RETIRED') e.wickets++;
      overMap.set(b.over, e);

      const key = `${b.inningsId}:${b.over}`;
      const so =
        singleOver.get(key) ??
        { runs: 0, over: b.over, opponent: b.innings.match.opponent, date: b.innings.match.date };
      so.runs += conceded;
      singleOver.set(key, so);
    }
    const byOver = [...overMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([over, e]) => ({
        over: over + 1,
        balls: e.balls,
        runs: e.runs,
        wickets: e.wickets,
        economy: e.balls ? +((e.runs / e.balls) * 6).toFixed(1) : null,
      }));
    const mostRunsInOver = [...singleOver.values()].sort((a, b) => b.runs - a.runs)[0] ?? null;
    const bestWicketOver = byOver.length
      ? [...byOver].sort((a, b) => b.wickets - a.wickets || a.economy! - b.economy!)[0]
      : null;

    const recentBowling = spells.slice(0, 6).map((s) => ({
      wickets: s.wickets,
      runs: s.runs,
      overs: oversStr(s.balls),
      economy: s.balls ? +((s.runs / s.balls) * 6).toFixed(1) : 0,
      opponent: s.innings.match.opponent,
      date: s.innings.match.date,
    }));

    // ── Bowling: extras, control & wicket types (from ball events + spells) ────
    const wides = spells.reduce((s, x) => s + x.wides, 0);
    const noBalls = spells.reduce((s, x) => s + x.noBalls, 0);
    const maidens = spells.reduce((s, x) => s + x.maidens, 0);

    let legalBowled = 0;
    let dotsBowled = 0;
    let foursConceded = 0;
    let sixesConceded = 0;
    const wicketTypeMap = new Map<string, number>();
    for (const b of balls) {
      const legal = b.extraType !== 'wide' && b.extraType !== 'no-ball';
      if (legal) legalBowled++;
      if (b.isSix) sixesConceded++;
      else if (b.isFour) foursConceded++;
      if (legal && b.runsBat === 0 && b.extras === 0) dotsBowled++;
      if (b.isWicket && b.dismissalType && b.dismissalType !== 'RUN_OUT' && b.dismissalType !== 'RETIRED') {
        wicketTypeMap.set(b.dismissalType, (wicketTypeMap.get(b.dismissalType) ?? 0) + 1);
      }
    }
    const bowlingExtras = { wides, noBalls, total: wides + noBalls };
    const bowlingControl = {
      dots: dotsBowled,
      dotPct: legalBowled ? +((dotsBowled / legalBowled) * 100).toFixed(1) : null,
      foursConceded,
      sixesConceded,
      boundaryPct: legalBowled ? +(((foursConceded + sixesConceded) / legalBowled) * 100).toFixed(1) : null,
      maidens,
    };
    const wicketTypes = [...wicketTypeMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      hasBatting: batting.length > 0,
      hasBowling: balls.length > 0 || spells.length > 0,
      batting: {
        byOrder,
        chaseVsFirst: { battingFirst: split(1), chasing: split(2) },
        recentForm: recentBatting,
        scoring: battingScoring,
      },
      bowling: {
        byOver,
        mostRunsInOver: mostRunsInOver
          ? {
              runs: mostRunsInOver.runs,
              over: mostRunsInOver.over + 1,
              opponent: mostRunsInOver.opponent,
              date: mostRunsInOver.date,
            }
          : null,
        bestWicketOver:
          bestWicketOver && bestWicketOver.wickets > 0
            ? { over: bestWicketOver.over, wickets: bestWicketOver.wickets }
            : null,
        recentForm: recentBowling,
        extras: bowlingExtras,
        control: bowlingControl,
        wicketTypes,
      },
    };
  }

  async matchScorecard(matchId: string) {
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

  /** Club-wide record: played / won / lost, win %, and a recent W-L trend. */
  async teamSummary() {
    const matches = await this.prisma.match.findMany({ orderBy: { date: 'desc' } });
    const by = (r: string) => matches.filter((m) => m.result === r).length;
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
      // Oldest → newest so the UI can draw a left-to-right trend line.
      trend: [...matches]
        .reverse()
        .map((m) => ({ id: m.id, result: m.result, title: m.title, date: m.date })),
    };
  }
}
