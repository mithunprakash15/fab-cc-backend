"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const ATTENDANCE_WEIGHT = {
    PRESENT: 1, LATE: 0.7, EXCUSED: 0.5, ABSENT: 0,
};
let EventsService = EventsService_1 = class EventsService {
    prisma;
    notifications;
    logger = new common_1.Logger(EventsService_1.name);
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async sendDueReminders() {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in1h = new Date(now.getTime() + 60 * 60 * 1000);
        const dayBefore = await this.prisma.event.findMany({
            where: { remindedDayBefore: false, startTime: { gt: now, lte: in24h } },
        });
        for (const e of dayBefore) {
            await this.notifications.broadcast('EVENT_REMINDER', `Tomorrow: ${e.title}`, `${e.venue ?? 'TBC'} · ${e.startTime.toLocaleString()}`, { eventId: e.id, reminder: 'day-before' });
            await this.prisma.event.update({ where: { id: e.id }, data: { remindedDayBefore: true } });
        }
        const hourBefore = await this.prisma.event.findMany({
            where: { remindedHourBefore: false, startTime: { gt: now, lte: in1h } },
        });
        for (const e of hourBefore) {
            await this.notifications.broadcast('EVENT_REMINDER', `Starting soon: ${e.title}`, `Begins at ${e.startTime.toLocaleTimeString()} · ${e.venue ?? 'TBC'}`, { eventId: e.id, reminder: 'hour-before' });
            await this.prisma.event.update({
                where: { id: e.id },
                data: { remindedHourBefore: true, remindedDayBefore: true },
            });
        }
        const sent = dayBefore.length + hourBefore.length;
        if (sent)
            this.logger.log(`Sent ${sent} event reminder push(es)`);
    }
    async create(input) {
        const event = await this.prisma.event.create({
            data: {
                ...input,
                date: new Date(input.date),
                startTime: new Date(input.startTime),
                endTime: new Date(input.endTime),
            },
        });
        await this.notifications.broadcast(event.type === 'MATCH' ? 'MATCH_ANNOUNCEMENT' : 'NEW_EVENT', event.type === 'MATCH' ? `Match: ${event.title}` : `New ${event.type.toLowerCase()}: ${event.title}`, `${event.venue ?? 'TBC'} · ${event.startTime.toLocaleString()}`, { eventId: event.id });
        return event;
    }
    remove(id) {
        return this.prisma.event.delete({ where: { id } });
    }
    list(upcomingOnly = false) {
        return this.prisma.event.findMany({
            where: upcomingOnly ? { startTime: { gte: new Date() } } : {},
            orderBy: { startTime: 'asc' },
            include: { rsvps: { include: { player: true } }, attendance: true },
        });
    }
    async rsvp(eventId, playerId, status) {
        const event = await this.prisma.event.findUniqueOrThrow({
            where: { id: eventId },
            include: { _count: { select: { rsvps: { where: { status: 'ACCEPTED' } } } } },
        });
        if (status === 'ACCEPTED' &&
            event.maxPlayers != null &&
            event._count.rsvps >= event.maxPlayers) {
            throw new common_1.ForbiddenException('Event is full');
        }
        return this.prisma.rsvp.upsert({
            where: { eventId_playerId: { eventId, playerId } },
            create: { eventId, playerId, status },
            update: { status },
        });
    }
    markAttendance(eventId, records) {
        return this.prisma.$transaction(records.map((r) => this.prisma.attendanceRecord.upsert({
            where: { eventId_playerId: { eventId, playerId: r.playerId } },
            create: { eventId, playerId: r.playerId, status: r.status },
            update: { status: r.status },
        })));
    }
    async attendanceSummary(playerId, since) {
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
};
exports.EventsService = EventsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventsService.prototype, "sendDueReminders", null);
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], EventsService);
//# sourceMappingURL=events.service.js.map