import { Controller, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NetworkConditionService, NetworkCondition } from './network-condition.service';

@ApiTags('network')
@Controller('api/connections/:connectionId/network')
export class NetworkConditionController {
  constructor(private readonly networkService: NetworkConditionService) {}

  @Get()
  @ApiOperation({ summary: 'Get active network conditions for a connection' })
  getCondition(@Param('connectionId') connectionId: string) {
    return this.networkService.getCondition(connectionId) ?? { active: false };
  }

  @Put()
  @ApiOperation({ summary: 'Set network simulation conditions' })
  setCondition(
    @Param('connectionId') connectionId: string,
    @Body() body: Partial<Omit<NetworkCondition, 'connectionId'>>,
  ) {
    return this.networkService.setCondition(connectionId, body);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear / disable network simulation conditions' })
  clearCondition(@Param('connectionId') connectionId: string) {
    this.networkService.clearCondition(connectionId);
    return { cleared: true };
  }
}
