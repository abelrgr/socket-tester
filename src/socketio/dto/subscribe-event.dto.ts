import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeEventDto {
  @ApiProperty({ example: 'chat-message', description: 'Socket.io event name to subscribe to' })
  @IsString()
  @MaxLength(200)
  eventName!: string;
}
