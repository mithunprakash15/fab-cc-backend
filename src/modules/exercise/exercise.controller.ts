import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ExerciseService } from './exercise.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateExerciseDto {
  @IsDateString() date: string;
  @IsString() activity: string;
  @IsInt() @Min(1) durationMin: number;
  @IsOptional() @IsNumber() distanceKm?: number;
  @IsOptional() @IsInt() calories?: number;
  @IsOptional() @IsString() notes?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('exercise')
export class ExerciseController {
  constructor(private exercise: ExerciseService) {}

  private playerId(req: any): string {
    if (!req.user.playerId) throw new ForbiddenException('No player profile linked');
    return req.user.playerId;
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateExerciseDto) {
    return this.exercise.create(this.playerId(req), dto);
  }

  @Get()
  list(@Req() req: any, @Query('since') since?: string) {
    return this.exercise.list(this.playerId(req), since ? new Date(since) : undefined);
  }

  @Get('summary')
  summary(@Req() req: any, @Query('playerId') playerId?: string) {
    const target = req.user.role === 'ADMIN' && playerId ? playerId : this.playerId(req);
    return this.exercise.summary(target);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.exercise.remove(id, this.playerId(req));
  }
}
