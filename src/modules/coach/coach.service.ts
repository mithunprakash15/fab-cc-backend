import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerContextService } from '../insights/player-context.service';

const SYSTEM_BASE = `You are the personal AI cricket coach for a FAB CC player.
Answer questions using ONLY the player's data provided below — their statistics,
training history, exercise logs, attendance, discipline scores, and ranking
history. Be specific and cite numbers from the data. Be encouraging but honest
about weaknesses. Give practical, cricket-specific advice (drills, net-session
plans, fitness routines). If asked something the data can't answer, say so.
Keep answers under 200 words unless a detailed plan is requested.`;

@Injectable()
export class CoachService {
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(
    private prisma: PrismaService,
    private playerContext: PlayerContextService,
  ) {}

  async chat(userId: string, playerId: string, message: string) {
    const [context, history] = await Promise.all([
      this.playerContext.build(playerId),
      this.prisma.coachMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const messages = [
      ...history.reverse().map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1000,
      system: `${SYSTEM_BASE}\n\nPlayer data:\n${context}`,
      messages,
    });
    const reply = response.content.find((b) => b.type === 'text')?.text ?? '';

    await this.prisma.coachMessage.createMany({
      data: [
        { userId, role: 'user', content: message },
        { userId, role: 'assistant', content: reply },
      ],
    });
    return { reply };
  }

  history(userId: string) {
    return this.prisma.coachMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }
}
