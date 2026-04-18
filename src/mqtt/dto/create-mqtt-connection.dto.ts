import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  IsArray,
  Min,
  Max,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class MqttWillDto {
  @IsString() @MaxLength(500) topic!: string;
  @IsString() @MaxLength(65535) payload!: string;
  @IsIn([0, 1, 2]) qos!: 0 | 1 | 2;
  @IsBoolean() retain!: boolean;
}

class MqttTlsDto {
  @IsOptional() @IsString() ca?: string;
  @IsOptional() @IsString() cert?: string;
  @IsOptional() @IsString() key?: string;
  @IsOptional() @IsBoolean() rejectUnauthorized?: boolean;
}

export class CreateMqttConnectionDto {
  @ApiProperty({ example: 'mqtt://localhost:1883' })
  @IsString()
  @MaxLength(2000)
  brokerUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

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
  keepalive?: number;

  @ApiPropertyOptional({ default: 30000, minimum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  connectTimeout?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  clean?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MqttWillDto)
  will?: MqttWillDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MqttTlsDto)
  tls?: MqttTlsDto;

  @ApiPropertyOptional({ description: 'Topics to subscribe immediately after connecting', example: ['#'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  initialTopics?: string[];
}
