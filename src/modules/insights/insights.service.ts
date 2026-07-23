import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Anthropic from '@anthropic-ai/sdk';
import { InsightKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerContextService } from './player-context.service';
import { NotificationsService } from '../notifications/notifications.service';

const SYSTEM = `You are the AI performance analyst for FAB CC, an amateur cricket club.
You receive one player's complete data (stats, training, exercise, attendance,
discipline, ranking history) as JSON. Produce concise, specific, motivating
feedback grounded ONLY in that data — cite concrete numbers ("you attended 7 of
8 sessions", "strike rate up 15% over your last 6 innings"). Never invent data.
Respond as strict JSON: {"strengths": string[], "weaknesses": string[],
"weeklyGoals": string[], "monthlyGoals": string[], "suggestions": string[],
"report": string} where report is a 3-4 sentence weekly summary.`;

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(
    private prisma: PrismaService,
    private context: PlayerContextService,
    private notifications: NotificationsService,
  ) {}

  /** Weekly report for every active player — Mondays 06:00. */
  @Cron('0 6 * * 1')
  async weeklyReports() {
    const players = await this.prisma.player.findMany({
      where: { isActive: true, userId: { not: null } },
      include: { user: true },
    });
    for (const player of players) {
      try {
        await this.generate(player.id);
        await this.notifications.send(
          player.user!.id, 'AI_WEEKLY_REPORT',
          'Your AI weekly report is ready',
          'Open the app to see your strengths, goals, and suggestions for this week.',
        );
      } catch (err) {
        this.logger.error(`Insight generation failed for ${player.name}: ${err}`);
      }
    }
  }

  async generate(playerId: string) {
    const context = await this.context.build(playerId);
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Player data:\n${context}` }],
    });
    const text = response.content.find((b) => b.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(text.replace(/^```json?\s*|\s*```$/g, ''));

    const kinds: [InsightKind, string[]][] = [
      [InsightKind.STRENGTH, parsed.strengths ?? []],
      [InsightKind.WEAKNESS, parsed.weaknesses ?? []],
      [InsightKind.WEEKLY_GOAL, parsed.weeklyGoals ?? []],
      [InsightKind.MONTHLY_GOAL, parsed.monthlyGoals ?? []],
      [InsightKind.SUGGESTION, parsed.suggestions ?? []],
      [InsightKind.REPORT, parsed.report ? [parsed.report] : []],
    ];
    await this.prisma.aiInsight.createMany({
      data: kinds.flatMap(([kind, items]) =>
        items.map((content: string) => ({ playerId, kind, content })),
      ),
    });
    return this.latest(playerId);
  }

  async latest(playerId: string) {
    const insights = await this.prisma.aiInsight.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const grouped: Record<string, string[]> = {};
    for (const i of insights) (grouped[i.kind] ??= []).push(i.content);
    return grouped;
  }
}
