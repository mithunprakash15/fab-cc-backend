import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { StatsEngineService } from './stats-engine.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, StatsEngineService],
  exports: [StatsService, StatsEngineService],
})
export class StatsModule {}
