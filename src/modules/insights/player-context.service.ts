import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';

/**
 * Assembles the full grounding context for AI features (insights + coach):
 * the player's stats, training, exercise, attendance, discipline, and ranking
 * history — serialised compactly for the model prompt.
 */
@Injectable()
export class PlayerContextService {
  constructor(
    private prisma: PrismaService,
    private stats: StatsService,
  ) {}

  async build(playerId: string): Promise<string> {
    const since = subDays(new Date(), 60);
    const [player, stats, training, exercise, attendance, discipline, snapshots] =
      await Promise.all([
        this.prisma.player.findUniqueOrThrow({ where: { id: playerId } }),
        this.stats.playerStats(playerId),
        this.prisma.trainingLog.findMany({
          where: { playerId, date: { gte: since } }, orderBy: { date: 'desc' },
        }),
        this.prisma.exerciseLog.findMany({
          where: { playerId, date: { gte: since } }, orderBy: { date: 'desc' },
        }),
        this.prisma.attendanceRecord.findMany({
          where: { playerId, event: { date: { gte: since } } }, include: { event: true },
        }),
        this.prisma.disciplineScore.findMany({
          where: { playerId }, orderBy: { weekStart: 'desc' }, take: 8,
        }),
        this.prisma.rankingSnapshot.findMany({
          where: { playerId, period: 'WEEKLY' }, orderBy: { periodStart: 'desc' }, take: 8,
        }),
      ]);

    return JSON.stringify(
      {
        player: {
          name: player.name, role: player.playingRole,
          battingStyle: player.battingStyle, bowlingStyle: player.bowlingStyle,
        },
        careerStats: stats,
        last60Days: {
          trainingSessions: training.map((t) => ({
            date: t.date.toISOString().slice(0, 10), type: t.type,
            minutes: t.durationMin, intensity: t.intensity,
          })),
          exerciseSessions: exercise.map((e) => ({
            date: e.date.toISOString().slice(0, 10), activity: e.activity,
            minutes: e.durationMin, km: e.distanceKm,
          })),
          attendance: attendance.map((a) => ({
            date: a.event.date.toISOString().slice(0, 10),
            event: a.event.title, status: a.status,
          })),
        },
        weeklyDiscipline: discipline.map((d) => ({
          week: d.weekStart.toISOString().slice(0, 10), overall: d.overall,
          comment: d.comment,
        })),
        rankingHistory: snapshots.map((s) => ({
          week: s.periodStart.toISOString().slice(0, 10), rank: s.rank,
          overall: +s.overallRating.toFixed(1), process: +s.processScore.toFixed(1),
          performance: +s.performanceScore.toFixed(1),
        })),
      },
      null,
      1,
    );
  }
}
