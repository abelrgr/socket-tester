import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SocketIoProxyService } from './socketio.service';
import { CreateSocketIoConnectionDto } from './dto/create-socketio-connection.dto';
import { SendSocketIoMessageDto } from './dto/send-socketio-message.dto';
import { SubscribeEventDto } from './dto/subscribe-event.dto';

@ApiTags('Connections - Socket.io')
@Controller('api/connections/socketio')
export class SocketIoController {
  constructor(private readonly sioService: SocketIoProxyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a proxied Socket.io connection' })
  @ApiResponse({ status: 201, description: 'Connection created' })
  createConnection(
    @Body() dto: CreateSocketIoConnectionDto,
  ): { connectionId: string } {
    return this.sioService.createConnection(dto);
  }

  @Post(':id/subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to a Socket.io event' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  subscribeEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubscribeEventDto,
  ): { subscribed: boolean } {
    this.sioService.subscribeEvent(id, dto);
    return { subscribed: true };
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Emit a Socket.io event' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendSocketIoMessageDto,
  ): Promise<unknown> {
    return this.sioService.sendMessage(id, dto);
  }
}
