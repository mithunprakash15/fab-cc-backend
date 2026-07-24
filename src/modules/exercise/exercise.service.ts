import { ForbiddenException, Injectable } from '@nestjs/common';
import { differenceInCalendarDays, startOfMonth, startOfWeek } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { RankingService } from '../ranking/ranking.service';

@Injectable()
export class ExerciseService {
  constructor(
    private prisma: PrismaService,
    private ranking: RankingService,
  ) {}

  async create(playerId: string, data: {
    date: string; activity: string; durationMin: number;
    distanceKm?: number; calories?: number; notes?: string;
  }) {
    const log = await this.prisma.exerciseLog.create({
      data: { ...data, playerId, date: new Date(data.date) },
    });
    this.ranking.recomputeSoon(); // exercise feeds the training bucket
    return log;
  }

  async remove(id: string, playerId: string) {
    const log = await this.prisma.exerciseLog.findUniqueOrThrow({ where: { id } });
    if (log.playerId !== playerId) throw new ForbiddenException('Not your log');
    const deleted = await this.prisma.exerciseLog.delete({ where: { id } });
    this.ranking.recomputeSoon();
    return deleted;
  }

  list(playerId: string, since?: Date) {
    return this.prisma.exerciseLog.findMany({
      where: { playerId, ...(since ? { date: { gte: since } } : {}) },
      orderBy: { date: 'desc' },
    });
  }

  async summary(playerId: string) {
    const logs = await this.prisma.exerciseLog.findMany({
      where: { playerId },
      orderBy: { date: 'desc' },
    });
    const now = new Date();
    const mins = (start: Date) =>
      logs.filter((l) => l.date >= start).reduce((s, l) => s + l.durationMin, 0);

    const days = [...new Set(logs.map((l) => l.date.toISOString().slice(0, 10)))]
      .sort()
      .reverse();
    let current = 0;
    let longest = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of days) {
      if (prev === null) {
        run = 1;
        current = differenceInCalendarDays(now, new Date(d)) <= 1 ? 1 : 0;
      } else if (differenceInCalendarDays(new Date(prev), new Date(d)) === 1) {
        run++;
        if (current > 0) current = run;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      prev = d;
    }

    return {
      weeklyHours: +(mins(startOfWeek(now, { weekStartsOn: 1 })) / 60).toFixed(1),
      monthlyHours: +(mins(startOfMonth(now)) / 60).toFixed(1),
      currentStreakDays: current,
      longestStreakDays: longest,
      totalDistanceKm: +logs.reduce((s, l) => s + (l.distanceKm ?? 0), 0).toFixed(1),
    };
  }
}
