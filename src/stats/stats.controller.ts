import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get global stats across all connections' })
  getGlobal() {
    return this.statsService.getGlobalStats();
  }

  @Get(':connectionId')
  @ApiOperation({ summary: 'Get enhanced per-connection stats with p95/p99' })
  getByConnection(@Param('connectionId') connectionId: string) {
    const stats = this.statsService.getEnhancedStats(connectionId);
    if (!stats) throw new NotFoundException('Connection not found');
    return stats;
  }
}
