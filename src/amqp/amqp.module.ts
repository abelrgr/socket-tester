import { Module } from '@nestjs/common';
import { AmqpProxyService } from './amqp.service';
import { AmqpController } from './amqp.controller';
import { EventsModule } from '../events/events.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [EventsModule, SessionModule],
  providers: [AmqpProxyService],
  controllers: [AmqpController],
})
export class AmqpProxyModule {}
