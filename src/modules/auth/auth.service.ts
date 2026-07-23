import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  role: 'ADMIN' | 'PLAYER';
  playerId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { player: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user.id, user.role, user.player?.id ?? null);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: payload.sub },
        include: { player: true },
      });
      return this.issueTokens(user.id, user.role, user.player?.id ?? null);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async registerPushToken(userId: string, pushToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken } });
  }

  private issueTokens(sub: string, role: string, playerId: string | null) {
    const payload = { sub, role, playerId };
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '30d',
      }),
    };
  }
}
