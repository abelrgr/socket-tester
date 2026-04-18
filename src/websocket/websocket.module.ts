import { Module } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { WebSocketController } from './websocket.controller';
import { EventsModule } from '../events/events.module';
import { SessionModule } from '../session/session.module';
import { LogModule } from '../log/log.module';
import { NetworkConditionModule } from '../network/network-condition.module';

@Module({
  imports: [EventsModule, SessionModule, LogModule, NetworkConditionModule],
  providers: [WebSocketService],
  controllers: [WebSocketController],
  exports: [WebSocketService],
})
export class WebSocketProxyModule {}
