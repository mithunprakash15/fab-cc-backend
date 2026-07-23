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
