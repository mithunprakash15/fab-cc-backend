import {
  Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DisciplineService } from './discipline.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class ScoreDisciplineDto {
  @IsString() playerId: string;
  @IsOptional() @IsString() weekStart?: string;
  @IsInt() @Min(0) @Max(10) attendance: number;
  @IsInt() @Min(0) @Max(10) punctuality: number;
  @IsInt() @Min(0) @Max(10) commitment: number;
  @IsInt() @Min(0) @Max(10) communication: number;
  @IsInt() @Min(0) @Max(10) respect: number;
  @IsInt() @Min(0) @Max(10) teamwork: number;
  @IsInt() @Min(0) @Max(10) sportsmanship: number;
  @IsInt() @Min(0) @Max(10) helpingOthers: number;
  @IsInt() @Min(0) @Max(10) behaviour: number;
  @IsInt() @Min(0) @Max(10) overall: number;
  @IsOptional() @IsString() comment?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('discipline')
export class DisciplineController {
  constructor(private discipline: DisciplineService) {}

  @Roles('ADMIN')
  @Post()
  score(@Body() dto: ScoreDisciplineDto) {
    return this.discipline.score(dto);
  }

  @Get(':playerId')
  history(@Param('playerId') playerId: string, @Req() req: any) {
    if (req.user.role !== 'ADMIN' && req.user.playerId !== playerId) {
      throw new ForbiddenException('You can only view your own discipline history');
    }
    return this.discipline.history(playerId);
  }
}
