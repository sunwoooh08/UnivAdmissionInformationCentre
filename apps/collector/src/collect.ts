import type { AdmissionDraft, AdmissionSchedule, CoverageEntry, CoverageSource, Source } from '@susi/shared';
import type { ConfigStatus, UniversityConfig } from './configs/types.js';
import { extractResults, type ExtractedRow, type ResultsSpec } from './extract/results.js';
import { extractPositionedMatrix } from './extract/positioned.js';
import { RobotsDisallowedError, RobotsUnavailableError, type PoliteFetcher } from './http.js';
import { pdfToWords, type PdfPage } from './pdf.js';
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
  /** 모든 자료를 성공적으로 읽었으면 true → 이번에 안 나온 옛 항목을 내려도 된다 */
  complete: boolean;
}

const PDF_MAGIC = Buffer.from('%PDF');

interface LoadedPdf {
  text: string;
  /** 좌표가 필요할 때만 읽는다 */
  words: () => Promise<PdfPage[]>;
}

/** 파일을 받아 PDF 텍스트로 */
async function fetchPdf(ctx: CollectContext, url: string): Promise<LoadedPdf> {
  const res = await ctx.fetcher.get(url);
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
  if (!res.body.subarray(0, 4).equals(PDF_MAGIC)) throw new Error(`PDF 가 아님 (${res.contentType || '알 수 없는 형식'})`);
  let words: Promise<PdfPage[]> | null = null;
  return { text: await ctx.pdfToText(res.body), words: () => (words ??= pdfToWords(res.body)) };
}

/** (전형, 모집단위) 단위로 수집 결과를 모은다 */
class DraftBook {
  private readonly map = new Map<string, AdmissionDraft>();
  constructor(
    private readonly univ: string,
    private readonly config: UniversityConfig,
  ) {}

  track(name: string): string {
    return this.config.trackAliases?.[name] ?? name;
  }

  dept(name: string): string {
    return this.config.deptAliases?.[name] ?? name;
  }

  get(track: string, dept: string): AdmissionDraft {
    const t = this.track(track);
    const d = this.dept(dept);
    const key = `${t}|${d}`;
    let draft = this.map.get(key);
    if (!draft) {
      draft = { univ: this.univ, track: t, dept: d, sources: [] };
      this.map.set(key, draft);
    }
    return draft;
  }

  addSource(draft: AdmissionDraft, source: Source) {
    if (!draft.sources.some((s) => s.url === source.url)) draft.sources.push(source);
  }

  /** 이 전형에 지금까지 나온 모집단위 */
  deptsOf(track: string): AdmissionDraft[] {
    const t = this.track(track);
    return [...this.map.values()].filter((d) => d.track === t);
  }

  all(): AdmissionDraft[] {
    return [...this.map.values()];
  }
}

function extract(text: string, spec: ResultsSpec): { rows: ExtractedRow[]; unmatched: number } {
  const r = extractResults(text, spec);
  return { rows: r.rows, unmatched: r.unmatched.length };
}

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
      complete: false,
      coverage: {
        ...base,
        status: (config?.status ?? 'unconfigured') as Exclude<ConfigStatus, 'active'>,
        message: config?.note ?? '자료 위치와 형식을 아직 확인하지 않음',
        sources: [],
        drafts: 0,
      },
    };
  }

  const book = new DraftBook(univ.name, config);
  const sources: CoverageSource[] = [];
  let blocked: string | null = null;

  const handle = async (label: string, url: string, work: (pdf: LoadedPdf, report: CoverageSource) => void | Promise<void>) => {
    const report: CoverageSource = { label, url, ok: false, rows: 0, unmatched: 0 };
    sources.push(report);
    try {
      const pdf = await fetchPdf(ctx, url);
      await work(pdf, report);
      report.ok = true;
      ctx.log(`${label}: ${report.rows}행${report.unmatched ? `, 형식 불일치 ${report.unmatched}줄` : ''}`);
    } catch (err) {
      report.ok = false;
      report.error = (err as Error).message;
      if (err instanceof RobotsDisallowedError) blocked = report.error;
      if (err instanceof RobotsUnavailableError) report.error = `${report.error} → 이번 실행은 건너뜀`;
      ctx.log(`${label}: 실패 — ${report.error}`);
    }
  };

  // 1) 입시결과: 지난 학년도 모집인원·충원
  for (const src of config.results ?? []) {
    await handle(src.label, src.url, async (pdf, report) => {
      const parts = src.spec ? [extract(pdf.text, src.spec)] : [];
      for (const spec of src.positioned ?? []) {
        const r = extractPositionedMatrix(await pdf.words(), spec);
        parts.push({ rows: r.rows, unmatched: r.unmatched.length });
      }
      const rows = parts.flatMap((p) => p.rows);
      const unmatched = parts.reduce((n, p) => n + p.unmatched, 0);
      report.unmatched = unmatched;
      const source: Source = { label: src.label, url: src.url, checkedAt: ctx.today };
      for (const row of rows) {
        const history = row.history.filter((h) => src.years.includes(h.year));
        if (history.length === 0) continue;
        const draft = book.get(row.track, row.dept);
        draft.category ??= row.category;
        draft.history = [...(draft.history ?? []).filter((h) => !history.some((x) => x.year === h.year)), ...history];
        book.addSource(draft, source);
        report.rows++;
      }
      if (report.rows === 0) throw new Error('표에서 모집단위를 하나도 읽지 못함 (양식이 바뀌었을 수 있음)');
    });
  }

  // 2) 모집요강: 올해 모집인원과 전형 일정
  const guide = config.guide;
  if (guide) {
    await handle(guide.label, guide.url, async (pdf, report) => {
      const source: Source = { label: guide.label, url: guide.url, checkedAt: ctx.today };
      const quotaResults = (guide.quotas ?? []).map((spec) => extract(pdf.text, spec));
      for (const spec of guide.positionedQuotas ?? []) {
        const r = extractPositionedMatrix(await pdf.words(), spec);
        quotaResults.push({ rows: r.rows, unmatched: r.unmatched.length });
      }
      for (const { rows, unmatched } of quotaResults) {
        report.unmatched += unmatched;
        for (const row of rows) {
          if (row.currentQuota === undefined) continue;
          const draft = book.get(row.track, row.dept);
          draft.category ??= row.category;
          draft.quota = row.currentQuota;
          book.addSource(draft, source);
          report.rows++;
        }
      }
      if ((guide.quotas?.length ?? 0) + (guide.positionedQuotas?.length ?? 0) > 0 && report.rows === 0) {
        throw new Error('모집인원 표를 읽지 못함 (양식이 바뀌었을 수 있음)');
      }
      // 일정은 그 전형에 속한 모집단위 전부에 적용
      for (const s of guide.schedules ?? []) {
        const targets = book.deptsOf(s.track);
        if (targets.length === 0) {
          ctx.log(`일정: '${s.track}' 전형의 모집단위를 찾지 못해 건너뜀`);
          continue;
        }
        const schedule: Partial<AdmissionSchedule> = {};
        for (const k of ['first', 'exam', 'final', 'register', 'waitlistEnd', 'waitlistRegEnd'] as const) {
          if (s[k] !== undefined) (schedule as Record<string, unknown>)[k] = s[k];
        }
        for (const draft of targets) {
          draft.schedule = { ...(draft.schedule ?? {}), ...schedule };
          if (s.category) draft.category = s.category;
          book.addSource(draft, source);
        }
      }
    });
  }

  const drafts = book.all();
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
  const complete = sources.length > 0 && okCount === sources.length;
  return { drafts, complete, coverage: { ...base, status, message, sources, drafts: drafts.length } };
}
