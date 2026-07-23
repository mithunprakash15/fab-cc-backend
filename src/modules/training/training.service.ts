import { ForbiddenException, Injectable } from '@nestjs/common';
import { TrainingType } from '@prisma/client';
import { differenceInCalendarDays, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  create(playerId: string, data: {
    date: string; durationMin: number; type: TrainingType; intensity: number;
    notes?: string; coach?: string; mediaUrls?: string[];
  }) {
    return this.prisma.trainingLog.create({
      data: { ...data, playerId, date: new Date(data.date), mediaUrls: data.mediaUrls ?? [] },
    });
  }

  async remove(id: string, playerId: string) {
    const log = await this.prisma.trainingLog.findUniqueOrThrow({ where: { id } });
    if (log.playerId !== playerId) throw new ForbiddenException('Not your log');
    return this.prisma.trainingLog.delete({ where: { id } });
  }

  list(playerId: string, since?: Date) {
    return this.prisma.trainingLog.findMany({
      where: { playerId, ...(since ? { date: { gte: since } } : {}) },
      orderBy: { date: 'desc' },
    });
  }

  /** Weekly / monthly / yearly totals, consistency, and streaks. */
  async summary(playerId: string) {
    const logs = await this.prisma.trainingLog.findMany({
      where: { playerId },
      orderBy: { date: 'desc' },
    });
    const now = new Date();
    const inWindow = (start: Date) => logs.filter((l) => l.date >= start);
    const minutes = (ls: typeof logs) => ls.reduce((s, l) => s + l.durationMin, 0);

    // Streaks over distinct active days
    const days = [...new Set(logs.map((l) => l.date.toISOString().slice(0, 10)))]
      .sort()
      .reverse();
    let current = 0;
    let longest = 0;
    let run = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0) {
        run = 1;
        const gap = differenceInCalendarDays(now, new Date(days[0]));
        current = gap <= 1 ? 1 : 0;
      } else {
        const gap = differenceInCalendarDays(new Date(days[i - 1]), new Date(days[i]));
        run = gap === 1 ? run + 1 : 1;
        if (current > 0 && current === run - (gap === 1 ? 0 : run)) {
          /* current continues only while gaps are 1 */
        }
        if (gap === 1 && current >= i) current++;
      }
      longest = Math.max(longest, run);
    }

    const byType = new Map<string, number>();
    for (const l of logs) byType.set(l.type, (byType.get(l.type) ?? 0) + l.durationMin);

    return {
      week: { sessions: inWindow(startOfWeek(now, { weekStartsOn: 1 })).length, minutes: minutes(inWindow(startOfWeek(now, { weekStartsOn: 1 }))) },
      month: { sessions: inWindow(startOfMonth(now)).length, minutes: minutes(inWindow(startOfMonth(now))) },
      year: { sessions: inWindow(startOfYear(now)).length, minutes: minutes(inWindow(startOfYear(now))) },
      currentStreakDays: current,
      longestStreakDays: longest,
      minutesByType: Object.fromEntries(byType),
      avgIntensity: logs.length
        ? +(logs.reduce((s, l) => s + l.intensity, 0) / logs.length).toFixed(1)
        : null,
    };
  }
}
