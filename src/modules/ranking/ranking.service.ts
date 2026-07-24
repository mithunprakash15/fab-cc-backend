import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RankingPeriod, TrainingType } from '@prisma/client';
import { differenceInCalendarDays, startOfWeek, subDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

const ATTENDANCE_WEIGHT: Record<string, number> = {
  PRESENT: 1, LATE: 0.7, EXCUSED: 0.5, ABSENT: 0,
};

// Quality weight per training type — the more skill-specific the session, the
// more it counts toward the Training score. Manual/machine nets & throwdowns are
// worth the most; batting/bowling/keeping/fielding drills next; conditioning
// less; recovery/other least (but still positive). See tierFor comment above.
export const TRAINING_TYPE_WEIGHT: Record<TrainingType, number> = {
  // A — dedicated nets (1.0)
  MACHINE_BOWLING: 1, MANUAL_BOWLING: 1, THROWDOWNS: 1,
  // B — skill practice (0.75)
  BATTING_NETS: 0.75, BOWLING_NETS: 0.75, WICKET_KEEPING: 0.75,
  FIELDING_PRACTICE: 0.75, SLIP_CATCHING: 0.75, HIGH_CATCH: 0.75,
  GROUND_FIELDING: 0.75, THROW_ACCURACY: 0.75,
  // C — conditioning (0.55)
  GYM: 0.55, STRENGTH_TRAINING: 0.55, FITNESS: 0.55, SPRINT_TRAINING: 0.55, RUNNING: 0.55,
  // D — recovery / general (0.4)
  MOBILITY: 0.4, RECOVERY: 0.4, YOGA: 0.4, STRETCHING: 0.4,
  SWIMMING: 0.4, CYCLING: 0.4, OTHER: 0.4,
};

const DEFAULT_WEIGHTS = { performanceWeight: 0.35, trainingWeight: 0.4, adminWeight: 0.25 };

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
 * The heart of the app. Overall rating blends three buckets:
 *   Match Performance 35% · Training 40% · Admin Marks 25%.
 * Training folds in type-weighted sessions, attendance and exercise, so months
 * of consistent quality work outrank a one-off century. Weights live in
 * RankingConfig and can be retuned by an admin.
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

  /**
   * Config weights, falling back to the 35/40/25 defaults if the row is missing
   * or doesn't sum to ~1. The latter guards the `prisma db push` upgrade, where
   * the pre-existing row keeps its old performanceWeight and gains defaulted
   * training/admin columns (summing to 0.95) — we don't want that stale blend.
   */
  private weights(config: { performanceWeight: number; trainingWeight: number; adminWeight: number }) {
    const { performanceWeight: pw, trainingWeight: tw, adminWeight: aw } = config;
    const sum = pw + tw + aw;
    if (!Number.isFinite(sum) || Math.abs(sum - 1) > 0.01) return DEFAULT_WEIGHTS;
    return { performanceWeight: pw, trainingWeight: tw, adminWeight: aw };
  }

  async recompute(period: RankingPeriod = RankingPeriod.WEEKLY) {
    const config =
      (await this.prisma.rankingConfig.findUnique({ where: { id: 'default' } })) ??
      (await this.prisma.rankingConfig.create({ data: { id: 'default' } }));
    const { performanceWeight, trainingWeight, adminWeight } = this.weights(config);

    const players = await this.prisma.player.findMany({ where: { isActive: true } });
    const now = new Date();
    const periodStart = startOfWeek(now, { weekStartsOn: 1 });
    const windowStart = subDays(now, 28);
    const seasonStart = subDays(now, 180);

    // First pass: raw component scores for every player
    const rows: {
      playerId: string;
      training: number;
      admin: number;
      performanceRaw: { batting: number; bowling: number; fielding: number; impact: number };
      improvement: number;
    }[] = [];

    for (const p of players) {
      rows.push({
        playerId: p.id,
        training: await this.trainingScore(p.id, windowStart, now),
        admin: await this.adminScore(p.id, windowStart),
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
        performance * performanceWeight +
          r.training * trainingWeight +
          r.admin * adminWeight,
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

      const componentScores = {
        // processScore mirrors trainingScore for backward-compat with old clients.
        processScore: s.training,
        trainingScore: s.training,
        adminScore: s.admin,
        performanceScore: s.performance,
        improvementScore: s.improvement,
        overallRating: s.overall,
        battingScore: s.batting, bowlingScore: s.bowling, fieldingScore: s.fielding,
        rank, previousRank: previous?.rank ?? null,
      };

      await this.prisma.rankingSnapshot.upsert({
        where: {
          playerId_period_periodStart: { playerId: s.playerId, period, periodStart },
        },
        create: { playerId: s.playerId, period, periodStart, ...componentScores },
        update: componentScores,
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

  // ── Training (0–100): type-weighted sessions + attendance + exercise ───────

  private async trainingScore(playerId: string, from: Date, to: Date): Promise<number> {
    const [attendance, training, exercise] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { playerId, event: { date: { gte: from, lte: to } } },
      }),
      this.prisma.trainingLog.findMany({ where: { playerId, date: { gte: from, lte: to } } }),
      this.prisma.exerciseLog.findMany({ where: { playerId, date: { gte: from, lte: to } } }),
    ]);
    const weeks = 4;

    // Quality-weighted volume vs a 300 weighted-min/week target. Doing high-value
    // sessions (nets) reaches the target faster than the same minutes of recovery.
    const weightedMin = training.reduce(
      (s, t) => s + t.durationMin * (TRAINING_TYPE_WEIGHT[t.type] ?? 0.5), 0,
    );
    const qualityScore = clamp((weightedMin / (300 * weeks)) * 100);

    // Frequency vs 4 days/week, with a consistency bump.
    const trainingDays = new Set(training.map((t) => t.date.toISOString().slice(0, 10)));
    const daysPerWeek = trainingDays.size / weeks;
    const consistent = daysPerWeek >= 3 ? 1.1 : 1;
    const freqScore = clamp((daysPerWeek / 4) * 100 * consistent);

    // Attendance % (weighted), neutral when no events were held.
    const attScore = attendance.length
      ? (attendance.reduce((s, a) => s + ATTENDANCE_WEIGHT[a.status], 0) / attendance.length) * 100
      : 50;

    // Exercise: active days / window days (5 days/week ≈ 100).
    const exDays = new Set(exercise.map((e) => e.date.toISOString().slice(0, 10)));
    const exScore = clamp((exDays.size / 28) * 100 * 1.4);

    return clamp(qualityScore * 0.45 + freqScore * 0.2 + attScore * 0.2 + exScore * 0.15);
  }

  // ── Admin marks (0–100): weekly discipline scores from an admin ────────────

  private async adminScore(playerId: string, from: Date): Promise<number> {
    const discipline = await this.prisma.disciplineScore.findMany({
      where: { playerId, weekStart: { gte: from } },
    });
    // overall is /10 in the DB → scale to /100. Neutral 50 when unrated.
    return discipline.length
      ? clamp((discipline.reduce((s, d) => s + d.overall, 0) / discipline.length) * 10)
      : 50;
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
  // Not part of the overall rating, but retained for the "most-improved" board.

  private async improvementScore(playerId: string): Promise<number> {
    const snapshots = await this.prisma.rankingSnapshot.findMany({
      where: { playerId, period: RankingPeriod.WEEKLY },
      orderBy: { periodStart: 'desc' },
      take: 8,
    });
    if (snapshots.length < 2) return 50; // neutral until trend data exists

    const series = snapshots
      .reverse()
      .map((s) => s.trainingScore * 0.6 + s.performanceScore * 0.4);
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
      training: (s) => s.trainingScore,
      admin: (s) => s.adminScore,
      process: (s) => s.trainingScore, // legacy alias → training
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

  async updateConfig(weights: { performanceWeight: number; trainingWeight: number; adminWeight: number }) {
    const sum = weights.performanceWeight + weights.trainingWeight + weights.adminWeight;
    if (Math.abs(sum - 1) > 0.001) throw new Error('Weights must sum to 1');
    const config = await this.prisma.rankingConfig.upsert({
      where: { id: 'default' }, create: { id: 'default', ...weights }, update: weights,
    });
    await this.recompute();
    return config;
  }
}
