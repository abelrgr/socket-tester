import { Allow, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSocketIoMessageDto {
  @ApiProperty({ example: 'chat-message', description: 'Socket.io event name to emit' })
  @IsString()
  @MaxLength(200)
  eventName!: string;

  @ApiProperty({ description: 'Payload to send with the event' })
  @Allow()
  payload!: unknown;

  @ApiPropertyOptional({ default: false, description: 'Wait for acknowledgment callback' })
  @IsOptional()
  @IsBoolean()
  ack?: boolean;
}
