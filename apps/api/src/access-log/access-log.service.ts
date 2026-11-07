import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type AccessAction = 'search' | 'view' | 'outlook' | 'schedule' | 'report';

export interface AccessLogEntry {
  at: string;
  action: AccessAction;
  method: string;
  path: string;
  /** 검색어, 예비번호 등 조회 파라미터 */
  query: Record<string, string>;
  admissionId: string | null;
  status: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
}

export interface AccessLogFilter {
  action?: AccessAction;
  admissionId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * 조회 로그. 메모리에 보관하면서 DATA_DIR/access-log.jsonl 에 한 줄씩 덧붙인다.
 * 서버를 재시작해도 파일에서 다시 읽어 온다.
 * LOG_RETENTION_DAYS(기본 90일)가 지난 기록은 시작 시와 6시간마다 파기한다.
 */
@Injectable()
export class AccessLogService implements OnModuleInit, OnModuleDestroy {
  private readonly retentionDays = Math.max(1, Number(process.env.LOG_RETENTION_DAYS ?? 90) || 90);
  private pruneTimer: NodeJS.Timeout | undefined;
  private readonly logger = new Logger(AccessLogService.name);
  private readonly file = join(process.env.DATA_DIR ?? join(process.cwd(), 'data'), 'access-log.jsonl');
  private entries: AccessLogEntry[] = [];
  private writing: Promise<void> = Promise.resolve();

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, 'utf8');
      this.entries = raw
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as AccessLogEntry];
          } catch {
            return [];
          }
        });
      this.logger.log(`Loaded ${this.entries.length} access log entries`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    await this.prune();
    this.pruneTimer = setInterval(() => void this.prune(), 6 * 3_600_000);
    this.pruneTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.pruneTimer);
  }

  /** 보관 기간이 지난 기록을 메모리와 파일에서 지운다. */
  async prune(): Promise<void> {
    const cutoff = Date.now() - this.retentionDays * 86_400_000;
    const kept = this.entries.filter((e) => new Date(e.at).getTime() >= cutoff);
    if (kept.length === this.entries.length) return;
    const removed = this.entries.length - kept.length;
    this.entries = kept;
    this.writing = this.writing
      .then(async () => {
        await mkdir(dirname(this.file), { recursive: true });
        const tmp = `${this.file}.tmp`;
        await writeFile(tmp, this.entries.map((e) => JSON.stringify(e)).join('\n') + (this.entries.length ? '\n' : ''), 'utf8');
        await rename(tmp, this.file);
        this.logger.log(`Pruned ${removed} access log entries older than ${this.retentionDays} days`);
      })
      .catch((err: unknown) => this.logger.error(`Failed to prune access log: ${String(err)}`));
    await this.writing;
  }

  record(entry: AccessLogEntry): void {
    this.entries.push(entry);
    const line = `${JSON.stringify(entry)}\n`;
    this.writing = this.writing
      .then(async () => {
        await mkdir(dirname(this.file), { recursive: true });
        await appendFile(this.file, line, 'utf8');
      })
      .catch((err: unknown) => this.logger.error(`Failed to write access log: ${String(err)}`));
  }

  list(filter: AccessLogFilter) {
    const matched = this.filtered(filter).reverse();
    const offset = filter.offset ?? 0;
    const limit = Math.min(filter.limit ?? 100, 1000);
    return { total: matched.length, items: matched.slice(offset, offset + limit) };
  }

  summary(filter: Pick<AccessLogFilter, 'from' | 'to'>, admissionLabel: (id: string) => string | null) {
    const rows = this.filtered(filter);
    const byAction: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byAdmission: Record<string, number> = {};
    const queries: Record<string, number> = {};
    const visitors = new Set<string>();
    for (const e of rows) {
      byAction[e.action] = (byAction[e.action] ?? 0) + 1;
      const day = kstDay(e.at);
      byDay[day] = (byDay[day] ?? 0) + 1;
      if (e.admissionId) byAdmission[e.admissionId] = (byAdmission[e.admissionId] ?? 0) + 1;
      const q = e.query.q?.trim();
      if (e.action === 'search' && q) queries[q] = (queries[q] ?? 0) + 1;
      if (e.ip) visitors.add(e.ip);
    }
    const top = (rec: Record<string, number>, n = 10) =>
      Object.entries(rec)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);
    return {
      total: rows.length,
      uniqueVisitors: visitors.size,
      byAction,
      byDay: Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, count]) => ({ day, count })),
      topAdmissions: top(byAdmission).map(([id, count]) => ({ id, label: admissionLabel(id), count })),
      topQueries: top(queries).map(([query, count]) => ({ query, count })),
    };
  }

  private filtered(f: AccessLogFilter): AccessLogEntry[] {
    return this.entries.filter(
      (e) =>
        (!f.action || e.action === f.action) &&
        (!f.admissionId || e.admissionId === f.admissionId) &&
        (!f.from || kstDay(e.at) >= f.from) &&
        (!f.to || kstDay(e.at) <= f.to),
    );
  }
}

function kstDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}
