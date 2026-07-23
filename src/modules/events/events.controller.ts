import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { AttendanceStatus, EventType, RsvpStatus } from '@prisma/client';
import {
  IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class CreateEventDto {
  @IsEnum(EventType) type: EventType;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() date: string;
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() coach?: string;
  @IsOptional() @IsNumber() maxPlayers?: number;
  @IsOptional() @IsString() notes?: string;
}

class RsvpDto {
  @IsEnum(RsvpStatus) status: RsvpStatus;
}

class AttendanceEntryDto {
  @IsString() playerId: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
}

class MarkAttendanceDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttendanceEntryDto)
  records: AttendanceEntryDto[];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.events.remove(id);
  }

  @Get()
  list(@Query('upcoming') upcoming?: string) {
    return this.events.list(upcoming === 'true');
  }

  @Post(':id/rsvp')
  rsvp(@Param('id') id: string, @Req() req: any, @Body() dto: RsvpDto) {
    if (!req.user.playerId) throw new ForbiddenException('No player profile linked');
    return this.events.rsvp(id, req.user.playerId, dto.status);
  }

  @Roles('ADMIN')
  @Post(':id/attendance')
  attendance(@Param('id') id: string, @Body() dto: MarkAttendanceDto) {
    return this.events.markAttendance(id, dto.records);
  }

  @Get('attendance/:playerId')
  attendanceSummary(@Param('playerId') playerId: string, @Query('since') since?: string) {
    return this.events.attendanceSummary(playerId, since ? new Date(since) : undefined);
  }
}
