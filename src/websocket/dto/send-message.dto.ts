import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message payload to send',
    example: '{"event":"ping"}',
  })
  @IsString()
  @MaxLength(1048576) // 1MB
  payload!: string;

  @ApiPropertyOptional({
    description: 'Payload type',
    enum: ['text', 'json', 'binary'],
    default: 'text',
  })
  @IsOptional()
  @IsIn(['text', 'json', 'binary'])
  type?: 'text' | 'json' | 'binary' = 'text';
}
