import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShareService } from './share.service';
import { CreateShareDto } from './dto/create-share.dto';

@ApiTags('Share')
@Controller('api/share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('config')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a shareable config link (credentials stripped)' })
  createShare(
    @Body() dto: CreateShareDto,
  ): { token: string; expiresAt: string; shareUrl: string } {
    const result = this.shareService.createShare(dto.config);
    return { ...result, shareUrl: `/share/${result.token}` };
  }

  @Get(':token')
  @ApiOperation({ summary: 'Retrieve a shared config by token' })
  getShare(@Param('token') token: string): Record<string, unknown> {
    // Sanitize token input: only hex chars expected
    const sanitized = token.replace(/[^a-f0-9]/gi, '').slice(0, 32);
    const config = this.shareService.getShare(sanitized);
    if (!config) throw new NotFoundException('Shared config not found or expired');
    return config;
  }
}
