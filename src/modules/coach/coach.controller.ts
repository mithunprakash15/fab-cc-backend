import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CoachService } from './coach.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class ChatDto {
  @IsNotEmpty() @IsString() @MaxLength(2000) message: string;
}

@UseGuards(JwtAuthGuard)
@Controller('coach')
export class CoachController {
  constructor(private coach: CoachService) {}

  @Post('chat')
  chat(@Req() req: any, @Body() dto: ChatDto) {
    if (!req.user.playerId) throw new ForbiddenException('No player profile linked');
    return this.coach.chat(req.user.sub, req.user.playerId, dto.message);
  }

  @Get('history')
  history(@Req() req: any) {
    return this.coach.history(req.user.sub);
  }
}
