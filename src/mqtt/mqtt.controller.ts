import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { MqttProxyService } from './mqtt.service';
import { CreateMqttConnectionDto } from './dto/create-mqtt-connection.dto';
import { MqttSubscribeDto, MqttUnsubscribeDto } from './dto/mqtt-subscribe.dto';
import { SendMqttMessageDto } from './dto/send-mqtt-message.dto';

@ApiTags('Connections - MQTT')
@Controller('api/connections/mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttProxyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a proxied MQTT connection' })
  createConnection(@Body() dto: CreateMqttConnectionDto): { connectionId: string } {
    return this.mqttService.createConnection(dto);
  }

  @Post(':id/subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to an MQTT topic' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  subscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MqttSubscribeDto,
  ): { subscribed: boolean } {
    this.mqttService.subscribe(id, dto);
    return { subscribed: true };
  }

  @Delete(':id/subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from an MQTT topic' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  unsubscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MqttUnsubscribeDto,
  ): { unsubscribed: boolean } {
    this.mqttService.unsubscribe(id, dto);
    return { unsubscribed: true };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a message to an MQTT topic' })
  @ApiParam({ name: 'id', description: 'Connection UUID' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMqttMessageDto,
  ): { published: boolean } {
    this.mqttService.publish(id, dto);
    return { published: true };
  }
}
