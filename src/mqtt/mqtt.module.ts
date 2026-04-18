import { Module } from '@nestjs/common';
import { MqttProxyService } from './mqtt.service';
import { MqttController } from './mqtt.controller';
import { EventsModule } from '../events/events.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [EventsModule, SessionModule],
  providers: [MqttProxyService],
  controllers: [MqttController],
})
export class MqttProxyModule {}
