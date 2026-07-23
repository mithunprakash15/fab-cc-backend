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
exports.ExerciseService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const prisma_service_1 = require("../../prisma/prisma.service");
let ExerciseService = class ExerciseService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(playerId, data) {
        return this.prisma.exerciseLog.create({
            data: { ...data, playerId, date: new Date(data.date) },
        });
    }
    async remove(id, playerId) {
        const log = await this.prisma.exerciseLog.findUniqueOrThrow({ where: { id } });
        if (log.playerId !== playerId)
            throw new common_1.ForbiddenException('Not your log');
        return this.prisma.exerciseLog.delete({ where: { id } });
    }
    list(playerId, since) {
        return this.prisma.exerciseLog.findMany({
            where: { playerId, ...(since ? { date: { gte: since } } : {}) },
            orderBy: { date: 'desc' },
        });
    }
    async summary(playerId) {
        const logs = await this.prisma.exerciseLog.findMany({
            where: { playerId },
            orderBy: { date: 'desc' },
        });
        const now = new Date();
        const mins = (start) => logs.filter((l) => l.date >= start).reduce((s, l) => s + l.durationMin, 0);
        const days = [...new Set(logs.map((l) => l.date.toISOString().slice(0, 10)))]
            .sort()
            .reverse();
        let current = 0;
        let longest = 0;
        let run = 0;
        let prev = null;
        for (const d of days) {
            if (prev === null) {
                run = 1;
                current = (0, date_fns_1.differenceInCalendarDays)(now, new Date(d)) <= 1 ? 1 : 0;
            }
            else if ((0, date_fns_1.differenceInCalendarDays)(new Date(prev), new Date(d)) === 1) {
                run++;
                if (current > 0)
                    current = run;
            }
            else {
                run = 1;
            }
            longest = Math.max(longest, run);
            prev = d;
        }
        return {
            weeklyHours: +(mins((0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 })) / 60).toFixed(1),
            monthlyHours: +(mins((0, date_fns_1.startOfMonth)(now)) / 60).toFixed(1),
            currentStreakDays: current,
            longestStreakDays: longest,
            totalDistanceKm: +logs.reduce((s, l) => s + (l.distanceKm ?? 0), 0).toFixed(1),
        };
    }
};
exports.ExerciseService = ExerciseService;
exports.ExerciseService = ExerciseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExerciseService);
//# sourceMappingURL=exercise.service.js.map