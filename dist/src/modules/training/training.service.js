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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const prisma_service_1 = require("../../prisma/prisma.service");
let TrainingService = class TrainingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(playerId, data) {
        return this.prisma.trainingLog.create({
            data: { ...data, playerId, date: new Date(data.date), mediaUrls: data.mediaUrls ?? [] },
        });
    }
    async remove(id, playerId) {
        const log = await this.prisma.trainingLog.findUniqueOrThrow({ where: { id } });
        if (log.playerId !== playerId)
            throw new common_1.ForbiddenException('Not your log');
        return this.prisma.trainingLog.delete({ where: { id } });
    }
    list(playerId, since) {
        return this.prisma.trainingLog.findMany({
            where: { playerId, ...(since ? { date: { gte: since } } : {}) },
            orderBy: { date: 'desc' },
        });
    }
    async summary(playerId) {
        const logs = await this.prisma.trainingLog.findMany({
            where: { playerId },
            orderBy: { date: 'desc' },
        });
        const now = new Date();
        const inWindow = (start) => logs.filter((l) => l.date >= start);
        const minutes = (ls) => ls.reduce((s, l) => s + l.durationMin, 0);
        const days = [...new Set(logs.map((l) => l.date.toISOString().slice(0, 10)))]
            .sort()
            .reverse();
        let current = 0;
        let longest = 0;
        let run = 0;
        for (let i = 0; i < days.length; i++) {
            if (i === 0) {
                run = 1;
                const gap = (0, date_fns_1.differenceInCalendarDays)(now, new Date(days[0]));
                current = gap <= 1 ? 1 : 0;
            }
            else {
                const gap = (0, date_fns_1.differenceInCalendarDays)(new Date(days[i - 1]), new Date(days[i]));
                run = gap === 1 ? run + 1 : 1;
                if (current > 0 && current === run - (gap === 1 ? 0 : run)) {
                }
                if (gap === 1 && current >= i)
                    current++;
            }
            longest = Math.max(longest, run);
        }
        const byType = new Map();
        for (const l of logs)
            byType.set(l.type, (byType.get(l.type) ?? 0) + l.durationMin);
        return {
            week: { sessions: inWindow((0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 })).length, minutes: minutes(inWindow((0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }))) },
            month: { sessions: inWindow((0, date_fns_1.startOfMonth)(now)).length, minutes: minutes(inWindow((0, date_fns_1.startOfMonth)(now))) },
            year: { sessions: inWindow((0, date_fns_1.startOfYear)(now)).length, minutes: minutes(inWindow((0, date_fns_1.startOfYear)(now))) },
            currentStreakDays: current,
            longestStreakDays: longest,
            minutesByType: Object.fromEntries(byType),
            avgIntensity: logs.length
                ? +(logs.reduce((s, l) => s + l.intensity, 0) / logs.length).toFixed(1)
                : null,
        };
    }
};
exports.TrainingService = TrainingService;
exports.TrainingService = TrainingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TrainingService);
//# sourceMappingURL=training.service.js.map