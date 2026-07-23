import { ConflictException, Injectable } from '@nestjs/common';
import { BattingStyle, BowlingStyle, PlayingRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpdatePlayerInput {
  name?: string;
  photoUrl?: string;
  jerseyNumber?: number;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  playingRole?: PlayingRole;
}

@Injectable()
export class PlayersService {
  private supabase = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_KEY ?? '',
  );

  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.player.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  get(id: string) {
    return this.prisma.player.findUniqueOrThrow({
      where: { id },
      include: { user: { select: { email: true } } },
    });
  }

  update(id: string, data: UpdatePlayerInput) {
    return this.prisma.player.update({
      where: { id },
      data: {
        ...data,
        ...(data.name ? { normalizedName: data.name.toLowerCase().trim() } : {}),
      },
    });
  }

  deactivate(id: string) {
    return this.prisma.player.update({ where: { id }, data: { isActive: false } });
  }

  /** Link a login account to a (possibly auto-created) player profile. */
  async createLogin(playerId: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role: 'PLAYER',
      },
    });
    return this.prisma.player.update({
      where: { id: playerId },
      data: { userId: user.id },
    });
  }

  /** Signed upload URL for photos/videos (player photos, training media). */
  async signedUploadUrl(path: string) {
    const bucket = process.env.SUPABASE_BUCKET ?? 'fabcc-media';
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUploadUrl(`${Date.now()}-${path}`);
    if (error) throw error;
    return data; // { signedUrl, token, path }
  }
}
