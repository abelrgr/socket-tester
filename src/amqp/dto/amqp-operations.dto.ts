import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AmqpSetupDto {
  @ApiPropertyOptional({ example: 'my-queue' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  queueName?: string;

  @ApiPropertyOptional({ example: 'my-exchange' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  exchangeName?: string;

  @ApiPropertyOptional({ enum: ['direct', 'fanout', 'topic', 'headers'], default: 'direct' })
  @IsOptional()
  @IsIn(['direct', 'fanout', 'topic', 'headers'])
  exchangeType?: 'direct' | 'fanout' | 'topic' | 'headers';

  @ApiPropertyOptional({ example: 'routing.key' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  routingKey?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  bindQueue?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  durable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoDelete?: boolean;
}

export class AmqpConsumeDto {
  @ApiPropertyOptional({ example: 'my-queue' })
  @IsString()
  @MaxLength(255)
  queue!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  noAck?: boolean;
}

export class AmqpAckDto {
  @ApiPropertyOptional()
  @IsString()
  deliveryTag!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @ApiPropertyOptional({ default: false, description: 'If true, reject (nack) instead of ack' })
  @IsOptional()
  @IsBoolean()
  nack?: boolean;
}

export class SendAmqpMessageDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  exchange?: string;

  @ApiPropertyOptional({ example: 'my-queue' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  routingKey?: string;

  @IsString()
  @MaxLength(65535)
  payload!: string;
}
