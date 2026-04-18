import { Module } from '@nestjs/common';
import { PerformanceTestService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { EventsModule } from '../events/events.module';
import { SessionModule } from '../session/session.module';
import { WebSocketProxyModule } from '../websocket/websocket.module';

@Module({
  imports: [EventsModule, SessionModule, WebSocketProxyModule],
  controllers: [PerformanceController],
  providers: [PerformanceTestService],
})
export class PerformanceModule {}
