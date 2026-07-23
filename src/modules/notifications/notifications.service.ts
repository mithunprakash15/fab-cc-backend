import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Expo } from 'expo-server-sdk';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

  constructor(private prisma: PrismaService) {}

  /** Persist in-app notification and deliver Expo push if a token exists. */
  async send(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    await this.prisma.notification.create({
      data: { userId, type, title, body, data: data as any },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      try {
        await this.expo.sendPushNotificationsAsync([
          { to: user.pushToken, title, body, data, sound: 'default' },
        ]);
      } catch (err) {
        this.logger.warn(`Push failed for user ${userId}: ${err}`);
      }
    }
  }

  async broadcast(
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const users = await this.prisma.user.findMany({ where: { role: 'PLAYER' } });
    await Promise.all(users.map((u) => this.send(u.id, type, title, body, data)));
  }

  feed(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }
}
