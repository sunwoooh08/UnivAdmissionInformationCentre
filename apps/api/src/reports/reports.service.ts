import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Report, ReportStatus } from '@susi/shared';
import { AdmissionsService } from '../admissions/admissions.service.js';
import { DatabaseService } from '../db/database.service.js';

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;

/** 이용자 오류 제보. IP당 10분에 5건까지 받는다. */
@Injectable()
export class ReportsService {
  private readonly recent = new Map<string, number[]>();

  constructor(
    private readonly database: DatabaseService,
    private readonly admissions: AdmissionsService,
  ) {}

  create(admissionId: string, message: string, ip: string): Report {
    const now = Date.now();
    const times = (this.recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (times.length >= MAX_PER_WINDOW) {
      throw new HttpException('제보가 너무 많습니다. 잠시 후 다시 시도하세요.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.admissions.get(admissionId); // 없는 항목이면 404
    times.push(now);
    this.recent.set(ip, times);

    const report: Report = {
      id: randomBytes(6).toString('base64url'),
      admissionId,
      message: message.trim(),
      status: 'open',
      createdAt: new Date(now).toISOString(),
      resolvedAt: null,
    };
    this.database.db
      .prepare('INSERT INTO reports (id, admission_id, message, status, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(report.id, report.admissionId, report.message, report.status, report.createdAt);
    return report;
  }

  list(status?: ReportStatus) {
    const rows = (
      status
        ? this.database.db.prepare('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC LIMIT 500').all(status)
        : this.database.db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 500').all()
    ) as unknown as { id: string; admission_id: string; message: string; status: ReportStatus; created_at: string; resolved_at: string | null }[];
    return rows.map((r) => ({
      id: r.id,
      admissionId: r.admission_id,
      label: this.admissions.label(r.admission_id),
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }));
  }

  resolve(reportId: string) {
    const res = this.database.db
      .prepare("UPDATE reports SET status = 'resolved', resolved_at = ? WHERE id = ?")
      .run(new Date().toISOString(), reportId);
    if (res.changes === 0) throw new NotFoundException();
    return { id: reportId, status: 'resolved' };
  }
}
