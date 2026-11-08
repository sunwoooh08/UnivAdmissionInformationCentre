import { Injectable } from '@nestjs/common';
import type { CoverageEntry, CoverageStatus, WorkingAdmission } from '@susi/shared';
import { DatabaseService } from '../db/database.service.js';

interface Row {
  univ_id: string;
  name: string;
  region: string;
  status: CoverageStatus;
  message: string | null;
  admission_site: string | null;
  sources: string;
  drafts: number;
  checked_at: string;
  last_ok_at: string | null;
}

/** 대학별 수집 현황 (수집기가 실행할 때마다 전체 대학 상태를 보낸다) */
@Injectable()
export class CoverageService {
  constructor(private readonly database: DatabaseService) {}

  save(entries: CoverageEntry[]) {
    const upsert = this.database.db.prepare(
      `INSERT INTO coverage (univ_id, name, region, status, message, admission_site, sources, drafts, checked_at, last_ok_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(univ_id) DO UPDATE SET
         name = excluded.name, region = excluded.region, status = excluded.status, message = excluded.message,
         admission_site = excluded.admission_site, sources = excluded.sources, drafts = excluded.drafts,
         checked_at = excluded.checked_at,
         last_ok_at = COALESCE(excluded.last_ok_at, coverage.last_ok_at)`,
    );
    this.database.transaction(() => {
      for (const e of entries) {
        const ok = e.status === 'ok' || e.status === 'partial';
        upsert.run(
          e.univId, e.name, e.region, e.status, e.message, e.admissionSite, JSON.stringify(e.sources), e.drafts, e.checkedAt,
          ok ? e.checkedAt : null,
        );
      }
    });
    return { saved: entries.length };
  }

  list() {
    const rows = this.database.db.prepare('SELECT * FROM coverage ORDER BY name').all() as unknown as Row[];
    // 대학별 공개 중인 모집단위 수
    const published = new Map<string, number>();
    for (const r of this.database.db.prepare('SELECT data FROM admissions WHERE published = 1 AND hidden = 0').all() as unknown as {
      data: string;
    }[]) {
      const univ = (JSON.parse(r.data) as WorkingAdmission).univ;
      published.set(univ, (published.get(univ) ?? 0) + 1);
    }
    const items = rows.map((r) => ({
      univId: r.univ_id,
      name: r.name,
      region: r.region,
      status: r.status,
      message: r.message,
      admissionSite: r.admission_site,
      sources: JSON.parse(r.sources) as CoverageEntry['sources'],
      drafts: r.drafts,
      checkedAt: r.checked_at,
      lastOkAt: r.last_ok_at,
      published: published.get(r.name) ?? 0,
    }));
    const counts: Partial<Record<CoverageStatus, number>> = {};
    for (const i of items) counts[i.status] = (counts[i.status] ?? 0) + 1;
    return { total: items.length, counts, items };
  }
}
