import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CoreModule } from './core/core.module';
import { EventsModule } from './events/events.module';
import { SessionModule } from './session/session.module';
import { WebSocketProxyModule } from './websocket/websocket.module';
import { SocketIoProxyModule } from './socketio/socketio.module';
import { MqttProxyModule } from './mqtt/mqtt.module';
import { AmqpProxyModule } from './amqp/amqp.module';
import { LogModule } from './log/log.module';
import { StatsModule } from './stats/stats.module';
import { NetworkConditionModule } from './network/network-condition.module';
import { PerformanceModule } from './performance/performance.module';
import { ShareModule } from './share/share.module';

@Module({
  imports: [
    CoreModule,
    EventsModule,
    SessionModule,
    LogModule,
    StatsModule,
    NetworkConditionModule,
    WebSocketProxyModule,
    SocketIoProxyModule,
    MqttProxyModule,
    AmqpProxyModule,
    PerformanceModule,
    ShareModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/{*path}', '/health', '/socket.io/{*path}'],
    }),
  ],
})
export class AppModule {}
