import { Module } from '@nestjs/common';
import { DisciplineController } from './discipline.controller';
import { DisciplineService } from './discipline.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [NotificationsModule, RankingModule],
  controllers: [DisciplineController],
  providers: [DisciplineService],
  exports: [DisciplineService],
})
export class DisciplineModule {}
