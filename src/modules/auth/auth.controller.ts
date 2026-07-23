import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class LoginDto {
  @IsEmail() email: string;
  @IsNotEmpty() @IsString() password: string;
}

class RefreshDto {
  @IsNotEmpty() @IsString() refreshToken: string;
}

class PushTokenDto {
  @IsNotEmpty() @IsString() pushToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('push-token')
  pushToken(@Req() req: any, @Body() dto: PushTokenDto) {
    return this.auth.registerPushToken(req.user.sub, dto.pushToken);
  }
}
