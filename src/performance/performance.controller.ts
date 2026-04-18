import { Controller, Post, Delete, Get, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  PerformanceTestService,
  LatencyTestConfig,
  ThroughputTestConfig,
} from './performance.service';

class StartLatencyTestDto implements LatencyTestConfig {
  @IsInt() @Min(1) @Max(1000) @Type(() => Number)
  count: number = 10;

  @IsInt() @Min(10) @Max(5000) @Type(() => Number)
  intervalMs: number = 100;
}

class StartThroughputTestDto implements ThroughputTestConfig {
  @IsInt() @Min(1) @Max(1000) @Type(() => Number)
  messagesPerSecond: number = 10;

  @IsInt() @Min(1) @Max(60) @Type(() => Number)
  durationSeconds: number = 5;

  @IsInt() @Min(1) @Max(65536) @Type(() => Number)
  payloadSize: number = 100;
}

@ApiTags('performance')
@Controller('api/connections/:connectionId/perf')
export class PerformanceController {
  constructor(private readonly perfService: PerformanceTestService) {}

  @Post('latency')
  @ApiOperation({ summary: 'Start a latency / RTT measurement test' })
  startLatency(
    @Param('connectionId') connectionId: string,
    @Body() dto: StartLatencyTestDto,
  ) {
    return this.perfService.startLatencyTest(connectionId, dto);
  }

  @Post('throughput')
  @ApiOperation({ summary: 'Start a throughput test' })
  startThroughput(
    @Param('connectionId') connectionId: string,
    @Body() dto: StartThroughputTestDto,
  ) {
    return this.perfService.startThroughputTest(connectionId, dto);
  }

  @Delete()
  @HttpCode(200)
  @ApiOperation({ summary: 'Abort the running test for a connection' })
  abort(@Param('connectionId') connectionId: string) {
    const ok = this.perfService.abortTest(connectionId);
    return { aborted: ok };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active test for a connection' })
  getActive(@Param('connectionId') connectionId: string) {
    return this.perfService.getActiveTest(connectionId) ?? { active: false };
  }

  @Get('results/:testId')
  @ApiOperation({ summary: 'Get results for a specific test' })
  getResults(@Param('testId') testId: string) {
    return this.perfService.getResults(testId) ?? { found: false };
  }
}
