import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60') * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100'),
      },
    ]),
  ],
  controllers: [HealthController],
})
export class CoreModule {}
