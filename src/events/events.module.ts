import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
