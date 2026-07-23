import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class StatsController {
  constructor(private stats: StatsService) {}

  @Get('players/:id/stats')
  playerStats(@Param('id') id: string, @Query('since') since?: string) {
    return this.stats.playerStats(id, since ? new Date(since) : undefined);
  }

  @Get('players/:id/analytics')
  playerAnalytics(@Param('id') id: string, @Query('since') since?: string) {
    return this.stats.playerAnalytics(id, since ? new Date(since) : undefined);
  }

  @Get('matches')
  matches() {
    return this.stats.listMatches();
  }

  @Get('team/summary')
  teamSummary() {
    return this.stats.teamSummary();
  }

  @Get('matches/:id/scorecard')
  scorecard(@Param('id') id: string) {
    return this.stats.matchScorecard(id);
  }
}
