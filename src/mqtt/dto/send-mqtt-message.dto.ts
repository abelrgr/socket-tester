import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMqttMessageDto {
  @ApiProperty({ example: 'sensors/temperature', description: 'MQTT topic to publish to' })
  @IsString()
  @MaxLength(500)
  topic!: string;

  @ApiProperty({ description: 'Message payload (string)' })
  @IsString()
  @MaxLength(65535)
  payload!: string;

  @ApiPropertyOptional({ enum: [0, 1, 2], default: 0 })
  @IsOptional()
  @IsIn([0, 1, 2])
  qos?: 0 | 1 | 2;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  retain?: boolean;
}
