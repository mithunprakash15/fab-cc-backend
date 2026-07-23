import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { PlayerContextService } from './player-context.service';
import { StatsModule } from '../stats/stats.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [StatsModule, NotificationsModule],
  controllers: [InsightsController],
  providers: [InsightsService, PlayerContextService],
  exports: [InsightsService, PlayerContextService],
})
export class InsightsModule {}
