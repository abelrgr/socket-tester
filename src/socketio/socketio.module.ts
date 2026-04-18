import { Module } from '@nestjs/common';
import { SocketIoProxyService } from './socketio.service';
import { SocketIoController } from './socketio.controller';
import { EventsModule } from '../events/events.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [EventsModule, SessionModule],
  providers: [SocketIoProxyService],
  controllers: [SocketIoController],
})
export class SocketIoProxyModule {}
