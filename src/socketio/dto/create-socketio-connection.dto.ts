import {
  IsString,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSocketIoConnectionDto {
  @ApiProperty({ example: 'http://localhost:3001', description: 'Socket.io server URL (http/https)' })
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_tld: false })
  url!: string;

  @ApiPropertyOptional({ example: '/chat', description: 'Namespace to connect to' })
  @IsOptional()
  @IsString()
  namespace?: string;

  @ApiPropertyOptional({ example: '/socket.io', description: 'Socket.io path override' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: 'Auth payload sent during handshake' })
  @IsOptional()
  @IsObject()
  auth?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Query params appended to the connection URL' })
  @IsOptional()
  @IsObject()
  query?: Record<string, string>;

  @ApiPropertyOptional({ enum: ['websocket', 'polling'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(['websocket', 'polling'], { each: true })
  transports?: ('websocket' | 'polling')[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoReconnect?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  reconnectionAttempts?: number;

  @ApiPropertyOptional({ description: 'Delay between reconnection attempts in ms', minimum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  reconnectionDelay?: number;

  @ApiPropertyOptional({ description: 'Extra HTTP headers sent on the upgrade request (e.g. override Origin, add API keys)' })
  @IsOptional()
  @IsObject()
  extraHeaders?: Record<string, string>;
}
