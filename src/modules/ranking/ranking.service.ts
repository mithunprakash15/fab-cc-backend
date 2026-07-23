import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RankingPeriod } from '@prisma/client';
import { differenceInCalendarDays, startOfWeek, subDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

const ATTENDANCE_WEIGHT: Record<string, number> = {
  PRESENT: 1, LATE: 0.7, EXCUSED: 0.5, ABSENT: 0,
};

export const TIERS = [
  { min: 90, label: 'Elite' },
  { min: 80, label: 'Excellent' },
  { min: 70, label: 'Very Good' },
  { min: 60, label: 'Good' },
  { min: 45, label: 'Average' },
  { min: 0, label: 'Needs Improvement' },
] as const;

export const tierFor = (rating: number) =>
  TIERS.find((t) => rating >= t.min)!.label;

/**
 * The heart of the app. Process & Discipline (default 60%) dominates Match
 * Performance (30%) and Improvement (10%) so that months of consistent
 * training outrank a one-off century. Weights live in RankingConfig.
 */
@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async nightly() {
    await this.recompute();
  }

  async recompute(period: RankingPeriod = RankingPeriod.WEEKLY) {
    const config =
      (await this.prisma.rankingConfig.findUnique({ where: { id: 'default' } })) ??
      (await this.prisma.rankingConfig.create({ data: { id: 'default' } }));

    const players = await this.prisma.player.findMany({ where: { isActive: true } });
    const now = new Date();
    const periodStart = startOfWeek(now, { weekStartsOn: 1 });
    const windowStart = subDays(now, 28);
    const seasonStart = subDays(now, 180);

    // First pass: raw component scores for every player
    const rows: {
      playerId: string;
      process: number;
      performanceRaw: { batting: number; bowling: number; fielding: number; impact: number };
      improvement: number;
    }[] = [];

    for (const p of players) {
      rows.push({
        playerId: p.id,
        process: await this.processScore(p.id, windowStart, now),
        performanceRaw: await this.performanceRaw(p.id, seasonStart),
        improvement: await this.improvementScore(p.id),
      });
    }

    // Normalise performance against club percentiles so it's comparable
    const norm = (vals: number[]) => {
      const max = Math.max(...vals, 1);
      return (v: number) => (v / max) * 100;
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
      // A player's performance is their best discipline plus support skills
      const performance = clamp(
        Math.max(batting, bowling) * 0.55 +
          Math.min(batting, bowling) * 0.2 +
          fielding * 0.15 +
          impact * 0.1,
      );
      const overall = clamp(
        r.process * config.processWeight +
          performance * config.performanceWeight +
          r.improvement * config.improvementWeight,
      );
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
          await this.notifications.send(
            player.user.id, 'RANKING_CHANGE',
            up ? `You moved up to #${rank} ▲` : `You dropped to #${rank} ▼`,
            `Overall rating ${s.overall.toFixed(1)} (${tierFor(s.overall)}).`,
          );
        }
      }
    }
    this.logger.log(`Recomputed ${period} rankings for ${scored.length} players`);
  }

  // ── Process & Discipline (0–100) ──────────────────────────────────────────

  private async processScore(playerId: string, from: Date, to: Date): Promise<number> {
    const [attendance, training, exercise, discipline] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { playerId, event: { date: { gte: from, lte: to } } },
      }),
      this.prisma.trainingLog.findMany({ where: { playerId, date: { gte: from, lte: to } } }),
      this.prisma.exerciseLog.findMany({ where: { playerId, date: { gte: from, lte: to } } }),
      this.prisma.disciplineScore.findMany({ where: { playerId, weekStart: { gte: from } } }),
    ]);

    // Attendance % (weighted)
    const attScore = attendance.length
      ? (attendance.reduce((s, a) => s + ATTENDANCE_WEIGHT[a.status], 0) / attendance.length) * 100
      : 50; // neutral when no events held

    // Training frequency vs 4 days/week target, with consistency multiplier
    const weeks = 4;
    const trainingDays = new Set(training.map((t) => t.date.toISOString().slice(0, 10)));
    const daysPerWeek = trainingDays.size / weeks;
    const consistent = daysPerWeek >= 3 ? 1.1 : 1;
    const freqScore = clamp((daysPerWeek / 4) * 100 * consistent);

    // Training volume vs 300 min/week
    const totalMin = training.reduce((s, t) => s + t.durationMin, 0);
    const volScore = clamp((totalMin / (300 * weeks)) * 100);

    // Exercise consistency: active days / window days
    const exDays = new Set(exercise.map((e) => e.date.toISOString().slice(0, 10)));
    const exScore = clamp((exDays.size / 28) * 100 * 1.4); // 5 days/week ≈ 100

    // Discipline (admin weekly marks, /10 → /100)
    const discScore = discipline.length
      ? (discipline.reduce((s, d) => s + d.overall, 0) / discipline.length) * 10
      : 50;

    // Streak bonus (combined training+exercise days), decays after 7-day gaps
    const allDays = [...new Set([...trainingDays, ...exDays])].sort().reverse();
    let streak = 0;
    for (let i = 0; i < allDays.length; i++) {
      const gap = i === 0
        ? differenceInCalendarDays(to, new Date(allDays[0]))
        : differenceInCalendarDays(new Date(allDays[i - 1]), new Date(allDays[i]));
      if (gap <= 1) streak++;
      else break;
    }
    const streakScore = clamp((Math.min(streak, 30) / 30) * 100);

    return clamp(
      attScore * 0.2 + freqScore * 0.2 + volScore * 0.1 +
      exScore * 0.15 + discScore * 0.25 + streakScore * 0.1,
    );
  }

  // ── Performance (raw, normalised later) ───────────────────────────────────

  private async performanceRaw(playerId: string, since: Date) {
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

    // Recent form: last 5 innings weighted 2x
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

    const fieldingPts = fielding.reduce(
      (s, f) => s + f.catches * 10 + f.runOuts * 12 + f.stumpings * 12, 0,
    );

    // Winning contribution: points earned in matches the club won
    const impact = batting
      .filter((b) => b.innings.match.result === 'WON')
      .reduce((s, b) => s + b.runs, 0) +
      bowling
        .filter((b) => b.innings.match.result === 'WON')
        .reduce((s, b) => s + b.wickets * 25, 0);

    return { batting: battingPts, bowling: bowlingPts, fielding: fieldingPts, impact };
  }

  // ── Improvement trend (0–100 via sigmoid over snapshot slope) ─────────────

  private async improvementScore(playerId: string): Promise<number> {
    const snapshots = await this.prisma.rankingSnapshot.findMany({
      where: { playerId, period: RankingPeriod.WEEKLY },
      orderBy: { periodStart: 'desc' },
      take: 8,
    });
    if (snapshots.length < 2) return 50; // neutral until trend data exists

    const series = snapshots
      .reverse()
      .map((s) => s.processScore * 0.6 + s.performanceScore * 0.4);
    // least-squares slope
    const n = series.length;
    const xMean = (n - 1) / 2;
    const yMean = series.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    series.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) ** 2;
    });
    const slope = den ? num / den : 0; // points per week
    return clamp(100 / (1 + Math.exp(-slope / 2))); // sigmoid: +2/wk ≈ 73, -2/wk ≈ 27
  }

  // ── Leaderboards ──────────────────────────────────────────────────────────

  async leaderboard(category: string, period: RankingPeriod = RankingPeriod.WEEKLY) {
    const latest = await this.prisma.rankingSnapshot.findFirst({
      where: { period }, orderBy: { periodStart: 'desc' },
    });
    if (!latest) return [];

    const snapshots = await this.prisma.rankingSnapshot.findMany({
      where: { period, periodStart: latest.periodStart },
      include: { player: true },
    });

    const key: Record<string, (s: (typeof snapshots)[0]) => number> = {
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

    // Tier is peer-relative AND somewhat absolute: blend the absolute overall
    // rating (60%) with the player's percentile within the squad (40%). So the
    // label reflects where you stand vs teammates, not just a fixed cut-off.
    const ratings = snapshots.map((s) => s.overallRating).sort((a, b) => a - b);
    const percentile = (r: number) =>
      ratings.length > 1
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
        tier: tierFor(s.overallRating * 0.6 + percentile(s.overallRating) * 0.4),
        movement:
          s.previousRank == null ? 'same'
          : s.previousRank > s.rank ? 'up'
          : s.previousRank < s.rank ? 'down' : 'same',
      }));
  }

  async updateConfig(weights: { processWeight: number; performanceWeight: number; improvementWeight: number }) {
    const sum = weights.processWeight + weights.performanceWeight + weights.improvementWeight;
    if (Math.abs(sum - 1) > 0.001) throw new Error('Weights must sum to 1');
    const config = await this.prisma.rankingConfig.upsert({
      where: { id: 'default' }, create: { id: 'default', ...weights }, update: weights,
    });
    await this.recompute();
    return config;
  }
}
