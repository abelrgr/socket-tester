import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AmqpProxyService } from './amqp.service';
import { CreateAmqpConnectionDto } from './dto/create-amqp-connection.dto';
import {
  AmqpSetupDto,
  AmqpConsumeDto,
  AmqpAckDto,
  SendAmqpMessageDto,
} from './dto/amqp-operations.dto';

@ApiTags('Connections - AMQP')
@Controller('api/connections/amqp')
export class AmqpController {
  constructor(private readonly amqpService: AmqpProxyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a proxied AMQP connection' })
  async createConnection(@Body() dto: CreateAmqpConnectionDto): Promise<{ connectionId: string }> {
    return this.amqpService.createConnection(dto);
  }

  @Post(':id/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assert exchange, queue, and/or binding' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  async setup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmqpSetupDto,
  ): Promise<{ ok: boolean }> {
    return this.amqpService.setup(id, dto);
  }

  @Post(':id/consume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start consuming messages from a queue' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  async consume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmqpConsumeDto,
  ): Promise<{ consuming: boolean }> {
    return this.amqpService.consume(id, dto);
  }

  @Post(':id/ack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge (or nack) a delivered message' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  ack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmqpAckDto,
  ): { ok: boolean } {
    this.amqpService.ack(id, dto);
    return { ok: true };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a message to an exchange/queue' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendAmqpMessageDto,
  ): { published: boolean } {
    this.amqpService.publish(id, dto);
    return { published: true };
  }
}
