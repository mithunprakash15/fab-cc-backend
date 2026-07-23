import { Module } from '@nestjs/common';
import { DisciplineController } from './discipline.controller';
import { DisciplineService } from './discipline.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DisciplineController],
  providers: [DisciplineService],
  exports: [DisciplineService],
})
export class DisciplineModule {}
