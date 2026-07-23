import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CommentaryService } from './commentary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class UploadCommentaryDto {
  @IsNotEmpty() @IsString() raw: string;
}

class UploadJsonDto {
  // One or two raw CricHeroes commentary JSON strings (1st + 2nd innings).
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2) @IsString({ each: true })
  files: string[];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('commentary')
export class CommentaryController {
  constructor(private service: CommentaryService) {}

  @Post('upload')
  upload(@Body() dto: UploadCommentaryDto) {
    return this.service.ingest(dto.raw);
  }

  @Post('upload-json')
  uploadJson(@Body() dto: UploadJsonDto) {
    return this.service.ingestJson(dto.files);
  }
}
