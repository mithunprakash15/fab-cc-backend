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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const expo_server_sdk_1 = require("expo-server-sdk");
const prisma_service_1 = require("../../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    prisma;
    logger = new common_1.Logger(NotificationsService_1.name);
    expo = new expo_server_sdk_1.Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    constructor(prisma) {
        this.prisma = prisma;
    }
    async send(userId, type, title, body, data) {
        await this.prisma.notification.create({
            data: { userId, type, title, body, data: data },
        });
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.pushToken && expo_server_sdk_1.Expo.isExpoPushToken(user.pushToken)) {
            try {
                await this.expo.sendPushNotificationsAsync([
                    { to: user.pushToken, title, body, data, sound: 'default' },
                ]);
            }
            catch (err) {
                this.logger.warn(`Push failed for user ${userId}: ${err}`);
            }
        }
    }
    async broadcast(type, title, body, data) {
        const users = await this.prisma.user.findMany({ where: { role: 'PLAYER' } });
        await Promise.all(users.map((u) => this.send(u.id, type, title, body, data)));
    }
    feed(userId) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    markRead(userId, id) {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: { readAt: new Date() },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map