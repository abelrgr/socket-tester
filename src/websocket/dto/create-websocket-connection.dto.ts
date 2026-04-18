import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  IsObject,
  IsArray,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateWebSocketConnectionDto {
  @ApiProperty({
    description: 'WebSocket URL to connect to (ws:// or wss://)',
    example: 'wss://echo.websocket.org',
  })
  @IsString()
  @MaxLength(2048)
  @Matches(/^wss?:\/\//, { message: 'URL must start with ws:// or wss://' })
  url!: string;

  @ApiPropertyOptional({
    description: 'Custom HTTP headers for the WebSocket handshake',
    example: { Authorization: 'Bearer token' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'WebSocket sub-protocols',
    example: ['chat', 'superchat'],
  })
  @IsOptional()
  @IsArray()
  protocols?: string[];
}
