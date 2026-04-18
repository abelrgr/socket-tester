import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class AmqpTlsDto {
  @IsOptional() @IsString() ca?: string;
  @IsOptional() @IsString() cert?: string;
  @IsOptional() @IsString() key?: string;
  @IsOptional() @IsBoolean() rejectUnauthorized?: boolean;
}

export class CreateAmqpConnectionDto {
  @ApiProperty({ example: 'amqp://localhost:5672', description: 'AMQP broker URL (amqp:// or amqps://)' })
  @IsString()
  @MaxLength(2000)
  url!: string;

  @ApiPropertyOptional({ example: '/', default: '/' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vhost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  password?: string;

  @ApiPropertyOptional({ default: 60, minimum: 0, maximum: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3600)
  heartbeat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AmqpTlsDto)
  tls?: AmqpTlsDto;
}
