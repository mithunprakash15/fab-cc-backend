import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class AnnouncementDto {
  @IsNotEmpty() @IsString() title: string;
  @IsNotEmpty() @IsString() body: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  feed(@Req() req: any) {
    return this.notifications.feed(req.user.sub);
  }

  @Post(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notifications.markRead(req.user.sub, id);
  }

  @Roles('ADMIN')
  @Post('announce')
  announce(@Body() dto: AnnouncementDto) {
    return this.notifications.broadcast('ANNOUNCEMENT', dto.title, dto.body);
  }
}
