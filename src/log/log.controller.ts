import { Controller, Get, Delete, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { LogService } from './log.service';

@ApiTags('logs')
@Controller('api/logs')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get(':connectionId')
  @ApiOperation({ summary: 'Get structured logs for a connection' })
  getByConnection(
    @Param('connectionId') connectionId: string,
    @Query('level') level?: string,
  ) {
    return this.logService.getByConnection(connectionId, level);
  }

  @Get(':connectionId/export')
  @ApiOperation({ summary: 'Export logs as NDJSON file download' })
  exportNdjson(
    @Param('connectionId') connectionId: string,
    @Res() res: Response,
  ): void {
    const ndjson = this.logService.exportNdjson(connectionId);
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="logs-${connectionId}.ndjson"`,
    );
    res.send(ndjson);
  }

  @Delete(':connectionId')
  @ApiOperation({ summary: 'Clear logs for a connection' })
  clearByConnection(@Param('connectionId') connectionId: string) {
    this.logService.clearByConnection(connectionId);
    return { cleared: true };
  }
}
