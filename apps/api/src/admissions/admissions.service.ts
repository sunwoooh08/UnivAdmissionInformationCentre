import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  admissionKey,
  computeOutlook,
  describeChanges,
  mergeDraft,
  missingForPublish,
  RULES_2027,
  validateDraft,
  validateMerged,
  type Admission,
  type AdmissionDraft,
  type AdmissionSchedule,
  type Category,
  type IngestLogEntry,
  type IngestOutcome,
  type IngestSummary,
  type WorkingAdmission,
} from '@susi/shared';
import { DatabaseService } from '../db/database.service.js';

interface Row {
  id: string;
  key: string;
  data: string;
  published: number;
  hidden: number;
  missing: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAdmissionRow {
  id: string;
  univ: string;
  track: string;
  dept: string;
  published: boolean;
  hidden: boolean;
  missing: string[];
  sources: number;
  historyYears: number[];
  updatedAt: string;
}

const id = () => randomBytes(6).toString('base64url');

function toAdmission(row: Row): Admission {
  const w = JSON.parse(row.data) as WorkingAdmission;
  return {
    id: row.id,
    univ: w.univ,
    track: w.track,
    dept: w.dept,
    category: w.category as Category,
    quota: w.quota as number,
    schedule: {
      first: w.schedule.first ?? null,
      exam: w.schedule.exam ?? null,
      final: w.schedule.final as string,
      register: w.schedule.register ?? null,
      waitlistEnd: w.schedule.waitlistEnd ?? null,
      waitlistRegEnd: w.schedule.waitlistRegEnd ?? null,
    } satisfies AdmissionSchedule,
    history: w.history,
    sources: w.sources,
    updatedAt: row.updated_at,
  };
}

/**
 * 지원 정보 저장소. 수집기가 보낸 결과를 자동 검증한 뒤 바로 반영한다.
 * 반영 전 값은 revisions 에 남겨 되돌릴 수 있다.
 */
@Injectable()
export class AdmissionsService {
  private cache: Admission[] | null = null;

  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  /** 공개 중인 항목 (검증을 통과했고 필수 값이 다 있으며 숨기지 않은 것) */
  all(): Admission[] {
    if (!this.cache) {
      const rows = this.db.prepare('SELECT * FROM admissions WHERE published = 1 AND hidden = 0').all() as unknown as Row[];
      this.cache = rows.map(toAdmission).sort((a, b) => a.univ.localeCompare(b.univ, 'ko') || a.dept.localeCompare(b.dept, 'ko'));
    }
    return this.cache;
  }

  search(q?: string, category?: Category): Admission[] {
    const terms = (q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    return this.all().filter((a) => {
      if (category && a.category !== category) return false;
      const hay = `${a.univ} ${a.track} ${a.category} ${a.dept}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  get(admissionId: string): Admission {
    const found = this.all().find((a) => a.id === admissionId);
    if (!found) throw new NotFoundException('해당 지원 정보를 찾을 수 없습니다.');
    return found;
  }

  outlook(admissionId: string, rank: number) {
    return computeOutlook(this.get(admissionId), rank);
  }

  label(admissionId: string): string | null {
    const row = this.db.prepare('SELECT data FROM admissions WHERE id = ?').get(admissionId) as { data: string } | undefined;
    if (!row) return null;
    const w = JSON.parse(row.data) as WorkingAdmission;
    return `${w.univ} · ${w.track} · ${w.dept}`;
  }

  // ───────── 수집 결과 반영 ─────────

  ingest(collector: string, drafts: AdmissionDraft[]): IngestSummary {
    const runId = id();
    const at = new Date().toISOString();
    const entries: IngestLogEntry[] = [];
    const counts: Record<IngestOutcome, number> = { created: 0, updated: 0, unchanged: 0, pending: 0, rejected: 0 };

    const find = this.db.prepare('SELECT * FROM admissions WHERE key = ?');
    const insert = this.db.prepare(
      'INSERT INTO admissions (id, key, data, published, missing, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const update = this.db.prepare('UPDATE admissions SET data = ?, published = ?, missing = ?, updated_at = ? WHERE id = ?');
    const saveRevision = this.db.prepare('INSERT INTO revisions (admission_id, data, at, run_id, collector) VALUES (?, ?, ?, ?, ?)');
    const log = this.db.prepare(
      'INSERT INTO ingest_log (id, run_id, collector, at, key, admission_id, outcome, messages) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );

    this.database.transaction(() => {
      for (const draft of drafts) {
        const key = typeof draft?.univ === 'string' ? admissionKey(draft) : '(형식 오류)';
        const row = key ? (find.get(key) as Row | undefined) : undefined;
        const base = row ? (JSON.parse(row.data) as WorkingAdmission) : null;

        let outcome: IngestOutcome;
        let messages: string[];
        let admissionId = row?.id ?? null;

        const errors = typeof draft?.univ === 'string' ? validateDraft(draft, base, RULES_2027) : ['수집 결과 형식이 올바르지 않습니다.'];
        const merged = errors.length ? null : mergeDraft(base, draft);
        const mergedErrors = merged ? validateMerged(merged) : [];

        if (!merged || mergedErrors.length) {
          outcome = 'rejected';
          messages = [...errors, ...mergedErrors];
        } else {
          const missing = missingForPublish(merged);
          const publish = missing.length === 0 ? 1 : 0;
          const changes = describeChanges(base, merged);
          const data = JSON.stringify(merged);
          if (!row) {
            admissionId = id();
            insert.run(admissionId, key, data, publish, JSON.stringify(missing), at, at);
            outcome = publish ? 'created' : 'pending';
            messages = publish ? changes : [`공개 대기: ${missing.join(', ')} 없음`];
          } else if (data === row.data) {
            outcome = 'unchanged';
            messages = [];
          } else {
            saveRevision.run(row.id, row.data, at, runId, collector);
            update.run(data, publish, JSON.stringify(missing), at, row.id);
            const sourceOnly = changes.length === 0;
            outcome = !publish ? 'pending' : sourceOnly ? 'unchanged' : row.published ? 'updated' : 'created';
            messages = !publish ? [`공개 대기: ${missing.join(', ')} 없음`, ...changes] : sourceOnly ? ['출처 확인일 갱신'] : changes;
          }
        }
        counts[outcome]++;
        const entry: IngestLogEntry = { id: id(), runId, collector, at, key, admissionId, outcome, messages };
        log.run(entry.id, runId, collector, at, key, admissionId, outcome, JSON.stringify(messages));
        entries.push(entry);
      }
    });
    this.cache = null;
    return { runId, counts, entries };
  }

  // ───────── 관리 ─────────

  adminList(filter: { q?: string; state?: 'published' | 'pending' | 'hidden' }): AdminAdmissionRow[] {
    const rows = this.db.prepare('SELECT * FROM admissions ORDER BY updated_at DESC').all() as unknown as Row[];
    const terms = (filter.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    return rows
      .map((r) => {
        const w = JSON.parse(r.data) as WorkingAdmission;
        return {
          id: r.id,
          univ: w.univ,
          track: w.track,
          dept: w.dept,
          published: r.published === 1,
          hidden: r.hidden === 1,
          missing: JSON.parse(r.missing) as string[],
          sources: w.sources.length,
          historyYears: w.history.map((h) => h.year),
          updatedAt: r.updated_at,
        };
      })
      .filter((a) => {
        if (filter.state === 'hidden' && !a.hidden) return false;
        if (filter.state === 'published' && (!a.published || a.hidden)) return false;
        if (filter.state === 'pending' && a.published) return false;
        const hay = `${a.univ} ${a.track} ${a.dept}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
  }

  adminDetail(admissionId: string) {
    const row = this.db.prepare('SELECT * FROM admissions WHERE id = ?').get(admissionId) as Row | undefined;
    if (!row) throw new NotFoundException();
    const revisions = this.db
      .prepare('SELECT id, at, run_id AS runId, collector, data FROM revisions WHERE admission_id = ? ORDER BY id DESC LIMIT 50')
      .all(admissionId) as unknown as { id: number; at: string; runId: string; collector: string; data: string }[];
    const current = JSON.parse(row.data) as WorkingAdmission;
    return {
      id: row.id,
      published: row.published === 1,
      hidden: row.hidden === 1,
      missing: JSON.parse(row.missing) as string[],
      updatedAt: row.updated_at,
      current,
      revisions: revisions.map((r) => {
        const prev = JSON.parse(r.data) as WorkingAdmission;
        return { id: r.id, at: r.at, runId: r.runId, collector: r.collector, changesSince: describeChanges(prev, current) };
      }),
    };
  }

  setHidden(admissionId: string, hidden: boolean) {
    const res = this.db.prepare('UPDATE admissions SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, admissionId);
    if (res.changes === 0) throw new NotFoundException();
    this.cache = null;
    return { id: admissionId, hidden };
  }

  /** 지정한 이력 시점의 값으로 되돌린다. 지금 값은 새 이력으로 남긴다. */
  revert(admissionId: string, revisionId: number) {
    const row = this.db.prepare('SELECT * FROM admissions WHERE id = ?').get(admissionId) as Row | undefined;
    const rev = this.db.prepare('SELECT data FROM revisions WHERE id = ? AND admission_id = ?').get(revisionId, admissionId) as
      | { data: string }
      | undefined;
    if (!row || !rev) throw new NotFoundException();
    const at = new Date().toISOString();
    const w = JSON.parse(rev.data) as WorkingAdmission;
    const missing = missingForPublish(w);
    this.database.transaction(() => {
      this.db.prepare('INSERT INTO revisions (admission_id, data, at, run_id, collector) VALUES (?, ?, ?, ?, ?)').run(
        admissionId, row.data, at, null, 'admin:revert',
      );
      this.db
        .prepare('UPDATE admissions SET data = ?, published = ?, missing = ?, updated_at = ? WHERE id = ?')
        .run(rev.data, missing.length ? 0 : 1, JSON.stringify(missing), at, admissionId);
    });
    this.cache = null;
    return this.adminDetail(admissionId);
  }

  ingestLog(filter: { runId?: string; outcome?: IngestOutcome; limit?: number; offset?: number }) {
    const where: string[] = [];
    const params: string[] = [];
    if (filter.runId) {
      where.push('run_id = ?');
      params.push(filter.runId);
    }
    if (filter.outcome) {
      where.push('outcome = ?');
      params.push(filter.outcome);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = (this.db.prepare(`SELECT COUNT(*) AS n FROM ingest_log ${clause}`).get(...params) as { n: number }).n;
    const limit = Math.min(filter.limit ?? 100, 1000);
    const rows = this.db
      .prepare(`SELECT * FROM ingest_log ${clause} ORDER BY at DESC, rowid DESC LIMIT ${limit} OFFSET ${filter.offset ?? 0}`)
      .all(...params) as unknown as {
      id: string; run_id: string; collector: string; at: string; key: string; admission_id: string | null; outcome: IngestOutcome; messages: string;
    }[];
    return {
      total,
      items: rows.map((r) => ({
        id: r.id, runId: r.run_id, collector: r.collector, at: r.at, key: r.key, admissionId: r.admission_id,
        outcome: r.outcome, messages: JSON.parse(r.messages) as string[],
      })),
    };
  }

  /** 최근 수집 실행 목록 */
  ingestRuns(limit = 30) {
    return this.db
      .prepare(
        `SELECT run_id AS runId, collector, MIN(at) AS at,
                SUM(outcome = 'created') AS created, SUM(outcome = 'updated') AS updated,
                SUM(outcome = 'unchanged') AS unchanged, SUM(outcome = 'pending') AS pending,
                SUM(outcome = 'rejected') AS rejected
         FROM ingest_log GROUP BY run_id ORDER BY at DESC LIMIT ?`,
      )
      .all(limit);
  }
}
