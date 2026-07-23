import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RankingPeriod } from '@prisma/client';
import { IsNumber, Max, Min } from 'class-validator';
import { RankingService } from './ranking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class WeightsDto {
  @IsNumber() @Min(0) @Max(1) processWeight: number;
  @IsNumber() @Min(0) @Max(1) performanceWeight: number;
  @IsNumber() @Min(0) @Max(1) improvementWeight: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rankings')
export class RankingController {
  constructor(private ranking: RankingService) {}

  @Get(':category')
  leaderboard(
    @Param('category') category: string,
    @Query('period') period?: RankingPeriod,
  ) {
    return this.ranking.leaderboard(category, period ?? RankingPeriod.WEEKLY);
  }

  @Roles('ADMIN')
  @Post('config')
  config(@Body() dto: WeightsDto) {
    return this.ranking.updateConfig(dto);
  }

  @Roles('ADMIN')
  @Post('recompute')
  recompute() {
    return this.ranking.recompute();
  }
}
