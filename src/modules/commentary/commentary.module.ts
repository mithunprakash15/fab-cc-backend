import { Module } from '@nestjs/common';
import { CommentaryController } from './commentary.controller';
import { CommentaryService } from './commentary.service';
import { CommentaryParserService } from './commentary-parser.service';
import { CricheroesParserService } from './cricheroes-parser.service';
import { StatsModule } from '../stats/stats.module';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [StatsModule, RankingModule],
  controllers: [CommentaryController],
  providers: [CommentaryService, CommentaryParserService, CricheroesParserService],
})
export class CommentaryModule {}
