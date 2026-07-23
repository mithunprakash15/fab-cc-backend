import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceStatus, EventType, RsvpStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateEventInput {
  type: EventType;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  latitude?: number;
  longitude?: number;
  coach?: string;
  maxPlayers?: number;
  notes?: string;
}

const ATTENDANCE_WEIGHT: Record<AttendanceStatus, number> = {
  PRESENT: 1, LATE: 0.7, EXCUSED: 0.5, ABSENT: 0,
};

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Runs every 5 minutes and sends the two pre-event reminder pushes: one ~a day
   * before, and one ~an hour before. Per-event flags guarantee each fires once.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendDueReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);

    // Day-before: event starts within the next 24h and hasn't been reminded yet.
    const dayBefore = await this.prisma.event.findMany({
      where: { remindedDayBefore: false, startTime: { gt: now, lte: in24h } },
    });
    for (const e of dayBefore) {
      await this.notifications.broadcast(
        'EVENT_REMINDER',
        `Tomorrow: ${e.title}`,
        `${e.venue ?? 'TBC'} · ${e.startTime.toLocaleString()}`,
        { eventId: e.id, reminder: 'day-before' },
      );
      await this.prisma.event.update({ where: { id: e.id }, data: { remindedDayBefore: true } });
    }

    // One-hour-before: event starts within the next hour and hasn't been reminded.
    const hourBefore = await this.prisma.event.findMany({
      where: { remindedHourBefore: false, startTime: { gt: now, lte: in1h } },
    });
    for (const e of hourBefore) {
      await this.notifications.broadcast(
        'EVENT_REMINDER',
        `Starting soon: ${e.title}`,
        `Begins at ${e.startTime.toLocaleTimeString()} · ${e.venue ?? 'TBC'}`,
        { eventId: e.id, reminder: 'hour-before' },
      );
      await this.prisma.event.update({
        where: { id: e.id },
        // Also flag day-before so a same-day event created <24h out isn't double-sent.
        data: { remindedHourBefore: true, remindedDayBefore: true },
      });
    }

    const sent = dayBefore.length + hourBefore.length;
    if (sent) this.logger.log(`Sent ${sent} event reminder push(es)`);
  }

  async create(input: CreateEventInput) {
    const event = await this.prisma.event.create({
      data: {
        ...input,
        date: new Date(input.date),
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
      },
    });
    await this.notifications.broadcast(
      event.type === 'MATCH' ? 'MATCH_ANNOUNCEMENT' : 'NEW_EVENT',
      event.type === 'MATCH' ? `Match: ${event.title}` : `New ${event.type.toLowerCase()}: ${event.title}`,
      `${event.venue ?? 'TBC'} · ${event.startTime.toLocaleString()}`,
      { eventId: event.id },
    );
    return event;
  }

  remove(id: string) {
    // Rsvps and attendance records cascade-delete with the event.
    return this.prisma.event.delete({ where: { id } });
  }

  list(upcomingOnly = false) {
    return this.prisma.event.findMany({
      where: upcomingOnly ? { startTime: { gte: new Date() } } : {},
      orderBy: { startTime: 'asc' },
      include: { rsvps: { include: { player: true } }, attendance: true },
    });
  }

  async rsvp(eventId: string, playerId: string, status: RsvpStatus) {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { _count: { select: { rsvps: { where: { status: 'ACCEPTED' } } } } },
    });
    if (
      status === 'ACCEPTED' &&
      event.maxPlayers != null &&
      event._count.rsvps >= event.maxPlayers
    ) {
      throw new ForbiddenException('Event is full');
    }
    return this.prisma.rsvp.upsert({
      where: { eventId_playerId: { eventId, playerId } },
      create: { eventId, playerId, status },
      update: { status },
    });
  }

  markAttendance(eventId: string, records: { playerId: string; status: AttendanceStatus }[]) {
    return this.prisma.$transaction(
      records.map((r) =>
        this.prisma.attendanceRecord.upsert({
          where: { eventId_playerId: { eventId, playerId: r.playerId } },
          create: { eventId, playerId: r.playerId, status: r.status },
          update: { status: r.status },
        }),
      ),
    );
  }

  async attendanceSummary(playerId: string, since?: Date) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { playerId, ...(since ? { event: { date: { gte: since } } } : {}) },
      include: { event: true },
      orderBy: { event: { date: 'desc' } },
    });
    const weighted = records.reduce((s, r) => s + ATTENDANCE_WEIGHT[r.status], 0);
    return {
      total: records.length,
      percentage: records.length ? +((weighted / records.length) * 100).toFixed(1) : null,
      byStatus: {
        present: records.filter((r) => r.status === 'PRESENT').length,
        late: records.filter((r) => r.status === 'LATE').length,
        excused: records.filter((r) => r.status === 'EXCUSED').length,
        absent: records.filter((r) => r.status === 'ABSENT').length,
      },
      history: records.slice(0, 30),
    };
  }
}
