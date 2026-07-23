import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { BattingStyle, BowlingStyle, PlayingRole } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { PlayersService } from './players.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class UpdatePlayerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsInt() jerseyNumber?: number;
  @IsOptional() @IsEnum(BattingStyle) battingStyle?: BattingStyle;
  @IsOptional() @IsEnum(BowlingStyle) bowlingStyle?: BowlingStyle;
  @IsOptional() @IsEnum(PlayingRole) playingRole?: PlayingRole;
}

class CreateLoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

class UploadUrlDto {
  @IsString() filename: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('players')
export class PlayersController {
  constructor(private players: PlayersService) {}

  @Get()
  list() {
    return this.players.list();
  }

  @Get('me')
  me(@Req() req: any) {
    if (!req.user.playerId) throw new ForbiddenException('No player profile linked');
    return this.players.get(req.user.playerId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.players.get(id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    if (req.user.role !== 'ADMIN' && req.user.playerId !== id) {
      throw new ForbiddenException('You can only edit your own profile');
    }
    return this.players.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.players.deactivate(id);
  }

  @Roles('ADMIN')
  @Post(':id/login')
  createLogin(@Param('id') id: string, @Body() dto: CreateLoginDto) {
    return this.players.createLogin(id, dto.email, dto.password);
  }

  @Post('upload-url')
  uploadUrl(@Body() dto: UploadUrlDto) {
    return this.players.signedUploadUrl(dto.filename);
  }
}
