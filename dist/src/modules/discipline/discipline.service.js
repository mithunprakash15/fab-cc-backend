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
exports.DisciplineService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let DisciplineService = class DisciplineService {
    prisma;
    notifications;
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async score(input) {
        const weekStart = (0, date_fns_1.startOfWeek)(input.weekStart ? new Date(input.weekStart) : new Date(), { weekStartsOn: 1 });
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
            await this.notifications.send(player.user.id, 'DISCIPLINE_UPDATED', 'Weekly discipline updated', `Your discipline score for this week is ${record.overall}/10.`, { weekStart: weekStart.toISOString() });
        }
        return record;
    }
    history(playerId) {
        return this.prisma.disciplineScore.findMany({
            where: { playerId },
            orderBy: { weekStart: 'desc' },
        });
    }
};
exports.DisciplineService = DisciplineService;
exports.DisciplineService = DisciplineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], DisciplineService);
//# sourceMappingURL=discipline.service.js.map