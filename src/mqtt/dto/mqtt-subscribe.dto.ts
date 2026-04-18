import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MqttSubscribeDto {
  @ApiProperty({ example: 'sensors/temperature', description: 'MQTT topic (supports + and # wildcards)' })
  @IsString()
  @MaxLength(500)
  topic!: string;

  @ApiPropertyOptional({ enum: [0, 1, 2], default: 0 })
  @IsOptional()
  @IsIn([0, 1, 2])
  qos?: 0 | 1 | 2;
}

export class MqttUnsubscribeDto {
  @ApiProperty({ example: 'sensors/temperature' })
  @IsString()
  @MaxLength(500)
  topic!: string;
}
