import { Injectable } from '@nestjs/common';
import { startOfWeek } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface DisciplineInput {
  playerId: string;
  weekStart?: string; // defaults to current week's Monday
  attendance: number;
  punctuality: number;
  commitment: number;
  communication: number;
  respect: number;
  teamwork: number;
  sportsmanship: number;
  helpingOthers: number;
  behaviour: number;
  overall: number;
  comment?: string;
}

@Injectable()
export class DisciplineService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async score(input: DisciplineInput) {
    const weekStart = startOfWeek(
      input.weekStart ? new Date(input.weekStart) : new Date(),
      { weekStartsOn: 1 },
    );
    const { playerId, weekStart: _w, ...scores } = input;
    const record = await this.prisma.disciplineScore.upsert({
      where: { playerId_weekStart: { playerId, weekStart } },
      create: { playerId, weekStart, ...scores },
      update: scores,
    });

    const player = await this.prisma.player.findUnique({
      where: { id: playerId }, include: { user: true },
    });
    if (player?.user) {
      await this.notifications.send(
        player.user.id,
        'DISCIPLINE_UPDATED',
        'Weekly discipline updated',
        `Your discipline score for this week is ${record.overall}/10.`,
        { weekStart: weekStart.toISOString() },
      );
    }
    return record;
  }

  history(playerId: string) {
    return this.prisma.disciplineScore.findMany({
      where: { playerId },
      orderBy: { weekStart: 'desc' },
    });
  }
}
