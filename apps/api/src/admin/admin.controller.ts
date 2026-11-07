import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AccessLogService } from '../access-log/access-log.service.js';
import { AdmissionsService } from '../admissions/admissions.service.js';
import { AdminListQueryDto, IngestDto, IngestLogQueryDto } from '../admissions/dto.js';
import { ReportsService } from '../reports/reports.service.js';
import { CoverageService } from '../coverage/coverage.service.js';
import { CoverageDto } from '../admissions/dto.js';
import { AdminGuard } from './admin.guard.js';
import { LogQueryDto, LogRangeDto } from './admin.dto.js';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly log: AccessLogService,
    private readonly admissions: AdmissionsService,
    private readonly reports: ReportsService,
    private readonly coverage: CoverageService,
  ) {}

  /** 토큰 확인용 */
  @Get('session')
  session() {
    return { ok: true };
  }

  // ── 접속 기록 ──
  @Get('logs')
  logs(@Query() q: LogQueryDto) {
    return this.log.list(q);
  }

  @Get('logs/summary')
  summary(@Query() q: LogRangeDto) {
    return this.log.summary(q, (id) => this.admissions.label(id));
  }

  // ── 수집 ──
  /** 수집기가 결과를 보낸다. 검증을 통과한 값은 바로 반영된다. */
  @Post('ingest')
  ingest(@Body() body: IngestDto) {
    const summary = this.admissions.ingest(body.collector, body.drafts);
    return { runId: summary.runId, counts: summary.counts };
  }

  /** 수집기가 실행마다 전체 대학의 상태를 보낸다 */
  @Post('coverage')
  saveCoverage(@Body() body: CoverageDto) {
    return this.coverage.save(body.entries);
  }

  @Get('coverage')
  listCoverage() {
    return this.coverage.list();
  }

  @Get('ingest/runs')
  runs() {
    return this.admissions.ingestRuns();
  }

  @Get('ingest/log')
  ingestLog(@Query() q: IngestLogQueryDto) {
    return this.admissions.ingestLog(q);
  }

  // ── 데이터 ──
  @Get('admissions')
  list(@Query() q: AdminListQueryDto) {
    return this.admissions.adminList(q);
  }

  @Get('admissions/:id')
  detail(@Param('id') id: string) {
    return this.admissions.adminDetail(id);
  }

  @Post('admissions/:id/hide')
  hide(@Param('id') id: string) {
    return this.admissions.setHidden(id, true);
  }

  @Post('admissions/:id/unhide')
  unhide(@Param('id') id: string) {
    return this.admissions.setHidden(id, false);
  }

  @Post('admissions/:id/revert/:revisionId')
  revert(@Param('id') id: string, @Param('revisionId', ParseIntPipe) revisionId: number) {
    return this.admissions.revert(id, revisionId);
  }

  // ── 제보 ──
  @Get('reports')
  listReports(@Query('status') status?: string) {
    return this.reports.list(status === 'open' || status === 'resolved' ? status : undefined);
  }

  @Post('reports/:id/resolve')
  resolveReport(@Param('id') id: string, @Body() _body: unknown) {
    return this.reports.resolve(id);
  }
}
