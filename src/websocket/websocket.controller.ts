import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { WebSocketService } from './websocket.service';
import { SessionService } from '../session/session.service';
import { CreateWebSocketConnectionDto } from './dto/create-websocket-connection.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Connections - WebSocket')
@Controller('api/connections')
export class WebSocketController {
  constructor(
    private readonly wsService: WebSocketService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('websocket')
  @ApiOperation({ summary: 'Create a WebSocket proxy connection' })
  @ApiResponse({ status: 201, description: 'Connection created' })
  @ApiResponse({ status: 400, description: 'Invalid URL or payload' })
  createConnection(
    @Body() dto: CreateWebSocketConnectionDto,
  ): { connectionId: string } {
    return this.wsService.createConnection(dto);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message through a WebSocket connection' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): { sent: boolean } {
    this.wsService.sendMessage(id, dto);
    return { sent: true };
  }

  @Post(':id/ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a WebSocket ping frame' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  sendPing(@Param('id', ParseUUIDPipe) id: string): { ping: boolean } {
    this.wsService.sendPing(id);
    return { ping: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close and remove a connection' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  @ApiResponse({ status: 204, description: 'Connection closed' })
  closeConnection(@Param('id', ParseUUIDPipe) id: string): void {
    this.wsService.closeConnection(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all active connections' })
  listConnections() {
    return this.sessionService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get connection details and status' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  getConnection(@Param('id', ParseUUIDPipe) id: string) {
    const session = this.sessionService.get(id);
    if (!session) {
      return { error: 'Connection not found' };
    }
    return session;
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get statistics for a connection' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    const session = this.sessionService.get(id);
    if (!session) {
      return { error: 'Connection not found' };
    }
    return session.stats;
  }
}
