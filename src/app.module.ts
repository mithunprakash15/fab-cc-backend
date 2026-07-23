import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlayersModule } from './modules/players/players.module';
import { CommentaryModule } from './modules/commentary/commentary.module';
import { StatsModule } from './modules/stats/stats.module';
import { EventsModule } from './modules/events/events.module';
import { TrainingModule } from './modules/training/training.module';
import { ExerciseModule } from './modules/exercise/exercise.module';
import { DisciplineModule } from './modules/discipline/discipline.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { InsightsModule } from './modules/insights/insights.module';
import { CoachModule } from './modules/coach/coach.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    PlayersModule,
    CommentaryModule,
    StatsModule,
    EventsModule,
    TrainingModule,
    ExerciseModule,
    DisciplineModule,
    RankingModule,
    InsightsModule,
    CoachModule,
    NotificationsModule,
  ],
})
export class AppModule {}
