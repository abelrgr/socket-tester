import { Module } from '@nestjs/common';
import { NetworkConditionService } from './network-condition.service';
import { NetworkConditionController } from './network-condition.controller';

@Module({
  controllers: [NetworkConditionController],
  providers: [NetworkConditionService],
  exports: [NetworkConditionService],
})
export class NetworkConditionModule {}
