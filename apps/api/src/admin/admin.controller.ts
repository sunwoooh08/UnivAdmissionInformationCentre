import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccessLogService } from '../access-log/access-log.service.js';
import { AdmissionsService } from '../admissions/admissions.service.js';
import { AdminGuard } from './admin.guard.js';
import { LogQueryDto, LogRangeDto } from './admin.dto.js';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly log: AccessLogService,
    private readonly admissions: AdmissionsService,
  ) {}

  /** 토큰 확인용 */
  @Get('session')
  session() {
    return { ok: true };
  }

  @Get('logs')
  logs(@Query() q: LogQueryDto) {
    return this.log.list(q);
  }

  @Get('logs/summary')
  summary(@Query() q: LogRangeDto) {
    return this.log.summary(q, (id) => {
      const a = this.admissions.all().find((x) => x.id === id);
      return a ? `${a.univ} · ${a.track} · ${a.dept}` : null;
    });
  }
}
