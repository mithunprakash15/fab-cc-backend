import { Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private insights: InsightsService) {}

  private assertAccess(req: any, playerId: string) {
    if (req.user.role !== 'ADMIN' && req.user.playerId !== playerId) {
      throw new ForbiddenException('You can only view your own insights');
    }
  }

  @Get(':playerId')
  latest(@Req() req: any, @Param('playerId') playerId: string) {
    this.assertAccess(req, playerId);
    return this.insights.latest(playerId);
  }

  @Post(':playerId/generate')
  generate(@Req() req: any, @Param('playerId') playerId: string) {
    this.assertAccess(req, playerId);
    return this.insights.generate(playerId);
  }
}
