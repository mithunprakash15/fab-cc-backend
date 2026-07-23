import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { TrainingType } from '@prisma/client';
import {
  IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min,
} from 'class-validator';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateTrainingDto {
  @IsDateString() date: string;
  @IsInt() @Min(1) durationMin: number;
  @IsEnum(TrainingType) type: TrainingType;
  @IsInt() @Min(1) @Max(10) intensity: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() coach?: string;
  @IsOptional() @IsArray() mediaUrls?: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  constructor(private training: TrainingService) {}

  private playerId(req: any): string {
    if (!req.user.playerId) throw new ForbiddenException('No player profile linked');
    return req.user.playerId;
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTrainingDto) {
    return this.training.create(this.playerId(req), dto);
  }

  @Get()
  list(@Req() req: any, @Query('since') since?: string, @Query('playerId') playerId?: string) {
    const target = req.user.role === 'ADMIN' && playerId ? playerId : this.playerId(req);
    return this.training.list(target, since ? new Date(since) : undefined);
  }

  @Get('summary')
  summary(@Req() req: any, @Query('playerId') playerId?: string) {
    const target = req.user.role === 'ADMIN' && playerId ? playerId : this.playerId(req);
    return this.training.summary(target);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.training.remove(id, this.playerId(req));
  }
}
