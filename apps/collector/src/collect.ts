import type { AdmissionDraft, CoverageEntry, CoverageSource } from '@susi/shared';
import type { ConfigStatus, UniversityConfig } from './configs/types.js';
import { extractResults } from './extract/results.js';
import { RobotsDisallowedError, RobotsUnavailableError, type PoliteFetcher } from './http.js';
import type { University } from './registry/index.js';

export interface CollectContext {
  fetcher: PoliteFetcher;
  pdfToText: (pdf: Buffer) => Promise<string>;
  /** 출처 확인일 (KST, YYYY-MM-DD) */
  today: string;
  log: (msg: string) => void;
}

export interface CollectOutcome {
  drafts: AdmissionDraft[];
  coverage: CoverageEntry;
}

const PDF_MAGIC = Buffer.from('%PDF');

/** 대학 한 곳의 설정대로 자료를 받아 수집 결과와 현황을 만든다 */
export async function collectUniversity(univ: University, config: UniversityConfig | undefined, ctx: CollectContext): Promise<CollectOutcome> {
  const base = {
    univId: univ.id,
    name: univ.name,
    region: univ.region,
    admissionSite: config?.admissionSite ?? null,
    checkedAt: new Date().toISOString(),
  };
  if (!config || config.status !== 'active') {
    return {
      drafts: [],
      coverage: {
        ...base,
        status: (config?.status ?? 'unconfigured') as Exclude<ConfigStatus, 'active'>,
        message: config?.note ?? '자료 위치와 형식을 아직 확인하지 않음',
        sources: [],
        drafts: 0,
      },
    };
  }

  const drafts: AdmissionDraft[] = [];
  const sources: CoverageSource[] = [];
  let blocked: string | null = null;

  for (const src of config.results ?? []) {
    const report: CoverageSource = { label: src.label, url: src.url, ok: false, rows: 0, unmatched: 0 };
    sources.push(report);
    try {
      const res = await ctx.fetcher.get(src.url);
      if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
      if (!res.body.subarray(0, 4).equals(PDF_MAGIC)) throw new Error(`PDF 가 아님 (${res.contentType || '알 수 없는 형식'})`);
      const text = await ctx.pdfToText(res.body);
      const { rows, unmatched } = extractResults(text, src.spec);
      report.rows = rows.length;
      report.unmatched = unmatched.length;
      if (rows.length === 0) throw new Error('표에서 모집단위를 하나도 읽지 못함 (양식이 바뀌었을 수 있음)');
      report.ok = true;
      for (const row of rows) {
        const history = row.history.filter((h) => src.years.includes(h.year));
        if (history.length === 0) continue;
        drafts.push({
          univ: univ.name,
          track: row.track,
          dept: row.dept,
          category: row.category,
          history,
          sources: [{ label: src.label, url: src.url, checkedAt: ctx.today }],
        });
      }
      ctx.log(`${src.label}: ${rows.length}행${unmatched.length ? `, 형식 불일치 ${unmatched.length}줄` : ''}`);
    } catch (err) {
      report.error = (err as Error).message;
      if (err instanceof RobotsDisallowedError) blocked = report.error;
      ctx.log(`${src.label}: 실패 — ${report.error}`);
      if (err instanceof RobotsUnavailableError) report.error = `${report.error} → 이번 실행은 건너뜀`;
    }
  }

  const okCount = sources.filter((s) => s.ok).length;
  const status: CoverageEntry['status'] = blocked
    ? 'robots-blocked'
    : okCount === 0
      ? 'error'
      : okCount < sources.length || sources.some((s) => s.unmatched > s.rows)
        ? 'partial'
        : 'ok';
  // 같은 오류가 자료마다 반복되면 한 번만 적는다
  const errors = [...new Set(sources.filter((s) => s.error).map((s) => s.error as string))];
  const message = blocked ?? (okCount === sources.length ? (config.note ?? null) : errors.join(' / '));
  return { drafts, coverage: { ...base, status, message, sources, drafts: drafts.length } };
}
