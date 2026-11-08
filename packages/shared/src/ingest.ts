import { dayNumber } from './dates.js';
import { CATEGORIES, type AdmissionDraft, type AdmissionSchedule, type Category, type HistoryYear, type Source } from './types.js';

/**
 * 자동 반영 전에 거치는 병합·검증 규칙.
 * 사람 검수를 대신하므로, 의심스러우면 반영하지 않는 쪽으로 판단한다.
 */

export interface IngestRules {
  /** 대상 학년도 (예: 2027) */
  cycleYear: number;
  /** 수시 일정이 있을 수 있는 기간 */
  windowStart: string;
  windowEnd: string;
  /** 수시 최초합격자 발표 마감 (대교협) */
  finalDeadline: string;
}

export const RULES_2027: IngestRules = {
  cycleYear: 2027,
  windowStart: '2026-09-01',
  windowEnd: '2027-01-31',
  finalDeadline: '2026-12-18',
};

/** 수집 중인 지원 정보. 아직 빈 값이 있을 수 있다. */
export interface WorkingAdmission {
  univ: string;
  track: string;
  dept: string;
  category?: Category;
  quota?: number;
  schedule: Partial<AdmissionSchedule>;
  history: HistoryYear[];
  sources: Source[];
}

const MAX_HISTORY = 3;
const MAX_QUOTA = 2000;
/** 충원인원이 모집인원의 이 배수를 넘으면 오류로 본다 */
const MAX_FILL_RATIO = 10;
/** 모집인원을 모를 때 충원인원 상한 */
const MAX_FILLED = 2000;

function norm(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, '').toLowerCase();
}

/** 같은 지원 단위를 찾기 위한 키: 대학|전형|모집단위 (공백·대소문자 무시) */
export function admissionKey(a: { univ: string; track: string; dept: string }): string {
  return `${norm(a.univ)}|${norm(a.track)}|${norm(a.dept)}`;
}

function clean(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** 기존 값에 수집 결과를 합친다. 수집 결과에 있는 값이 우선한다. */
export function mergeDraft(base: WorkingAdmission | null, draft: AdmissionDraft): WorkingAdmission {
  const schedule: Partial<AdmissionSchedule> = { ...(base?.schedule ?? {}) };
  for (const [k, v] of Object.entries(draft.schedule ?? {})) {
    if (v !== undefined) (schedule as Record<string, unknown>)[k] = v;
  }

  const byYear = new Map<number, HistoryYear>();
  for (const h of base?.history ?? []) byYear.set(h.year, h);
  for (const h of draft.history ?? []) byYear.set(h.year, { year: h.year, quota: h.quota, filled: h.filled });
  const history = [...byYear.values()].sort((a, b) => b.year - a.year).slice(0, MAX_HISTORY);

  const sources = new Map<string, Source>();
  for (const s of [...(base?.sources ?? []), ...draft.sources]) {
    const prev = sources.get(s.url);
    if (!prev || prev.checkedAt < s.checkedAt) sources.set(s.url, { ...s, label: clean(s.label) });
  }

  return {
    univ: base?.univ ?? clean(draft.univ),
    track: base?.track ?? clean(draft.track),
    dept: base?.dept ?? clean(draft.dept),
    category: draft.category ?? base?.category,
    quota: draft.quota ?? base?.quota,
    schedule,
    history,
    sources: [...sources.values()],
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

function isInt(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}

/**
 * 수집 결과 자체가 말이 되는지 본다. 하나라도 걸리면 이 건은 통째로 반영하지 않는다.
 */
export function validateDraft(draft: AdmissionDraft, base: WorkingAdmission | null, rules: IngestRules): string[] {
  const errors: string[] = [];
  for (const f of ['univ', 'track', 'dept'] as const) {
    const v = draft[f];
    if (typeof v !== 'string' || !clean(v) || v.length > 80) errors.push(`${f} 값이 비어 있거나 너무 깁니다.`);
  }
  if (!Array.isArray(draft.sources) || draft.sources.length === 0) errors.push('출처가 없습니다.');
  for (const s of draft.sources ?? []) {
    if (!/^https?:\/\/[^\s]+$/.test(s.url)) errors.push(`출처 URL이 올바르지 않습니다: ${s.url}`);
    if (!isValidDate(s.checkedAt)) errors.push(`출처 확인일이 올바르지 않습니다: ${s.checkedAt}`);
  }
  if (draft.category !== undefined && !CATEGORIES.includes(draft.category)) errors.push(`알 수 없는 전형 유형: ${draft.category}`);
  if (draft.quota !== undefined && !isInt(draft.quota, 1, MAX_QUOTA)) errors.push(`모집인원이 비정상입니다: ${draft.quota}`);

  for (const h of draft.history ?? []) {
    if (!isInt(h.year, 2015, rules.cycleYear - 1)) errors.push(`입시결과 학년도가 비정상입니다: ${h.year}`);
    if (h.quota !== null && !isInt(h.quota, 1, MAX_QUOTA)) errors.push(`${h.year} 모집인원이 비정상입니다: ${h.quota}`);
    if (!isInt(h.filled, 0, MAX_FILLED)) errors.push(`${h.year} 충원인원이 비정상입니다: ${h.filled}`);
    else if (isInt(h.quota, 1, MAX_QUOTA) && h.filled > h.quota * MAX_FILL_RATIO)
      errors.push(`${h.year} 충원인원(${h.filled})이 모집인원(${h.quota})의 ${MAX_FILL_RATIO}배를 넘습니다.`);
  }
  const years = (draft.history ?? []).map((h) => h.year);
  if (new Set(years).size !== years.length) errors.push('같은 학년도 입시결과가 중복됩니다.');

  const s = draft.schedule ?? {};
  const inWindow = (d: string) => dayNumber(d) >= dayNumber(rules.windowStart) && dayNumber(d) <= dayNumber(rules.windowEnd);
  const checkDate = (label: string, d: unknown) => {
    if (d === undefined || d === null) return;
    if (!isValidDate(d)) errors.push(`${label} 날짜 형식이 올바르지 않습니다: ${String(d)}`);
    else if (!inWindow(d)) errors.push(`${label}(${d})이 ${rules.cycleYear}학년도 수시 기간을 벗어납니다.`);
  };
  checkDate('1단계 발표', s.first);
  checkDate('면접·고사 시작', s.exam?.[0]);
  checkDate('면접·고사 종료', s.exam?.[1]);
  checkDate('최초합격 발표', s.final);
  checkDate('등록 시작', s.register?.[0]);
  checkDate('등록 종료', s.register?.[1]);
  checkDate('충원 통보 마감', s.waitlistEnd);
  checkDate('충원 등록 마감', s.waitlistRegEnd);
  if (isValidDate(s.final) && dayNumber(s.final) > dayNumber(rules.finalDeadline))
    errors.push(`최초합격 발표(${s.final})가 대교협 발표 마감(${rules.finalDeadline}) 이후입니다.`);

  // 같은 학년도 값이 기존과 크게 다르면 표를 잘못 읽었을 가능성이 높다
  for (const h of draft.history ?? []) {
    const prev = base?.history.find((x) => x.year === h.year);
    if (prev?.quota && h.quota && Math.abs(prev.quota - h.quota) > Math.max(3, prev.quota * 0.5))
      errors.push(`${h.year} 모집인원이 기존 값(${prev.quota})과 크게 다릅니다: ${h.quota}`);
    if (prev && Math.abs(prev.filled - h.filled) > Math.max(10, prev.filled * 2))
      errors.push(`${h.year} 충원인원이 기존 값(${prev.filled})과 크게 다릅니다: ${h.filled}`);
  }
  return errors;
}

/** 합친 결과의 앞뒤가 맞는지 본다. (일정 순서 등) */
export function validateMerged(m: WorkingAdmission): string[] {
  const errors: string[] = [];
  const s = m.schedule;
  const before = (a: string | null | undefined, b: string | null | undefined) =>
    a && b && isValidDate(a) && isValidDate(b) && dayNumber(a) > dayNumber(b);
  if (s.exam && before(s.exam[0], s.exam[1])) errors.push('면접·고사 시작이 종료보다 늦습니다.');
  if (before(s.first, s.exam?.[0])) errors.push('1단계 발표가 면접·고사보다 늦습니다.');
  if (before(s.first, s.final)) errors.push('1단계 발표가 최초합격 발표보다 늦습니다.');
  if (before(s.exam?.[1], s.final)) errors.push('면접·고사가 최초합격 발표보다 늦습니다.');
  if (s.register && before(s.register[0], s.register[1])) errors.push('등록 시작이 종료보다 늦습니다.');
  if (before(s.final, s.register?.[0])) errors.push('최초합격 발표가 등록 시작보다 늦습니다.');
  return errors;
}

/**
 * 사이트에 공개하는 데 필요한 값이 다 있는지. 빈 항목 이름을 돌려준다.
 * 일정이나 충원 이력 중 하나만 있어도 공개한다 (부분 공개).
 */
export function missingForPublish(m: WorkingAdmission): string[] {
  const missing: string[] = [];
  if (!m.category) missing.push('전형 유형');
  if (!m.schedule.final && m.history.length === 0) missing.push('최초합격 발표일 또는 충원 이력');
  return missing;
}

/** 전형명으로 전형 유형을 추정한다 */
export function inferCategory(track: string): Category {
  const t = track.replace(/\s+/g, '');
  if (/논술/.test(t)) return '논술';
  if (/교과|추천|지역균형|학교장/.test(t) && !/종합/.test(t)) return '학생부교과';
  if (/실기|실적|특기|예체능|체육/.test(t)) return '실기/실적';
  if (/종합|활동|면접|서류|인재|기회균형|농어촌|특성화|국제/.test(t)) return '학생부종합';
  return '기타';
}

/** 두 상태를 비교해 바뀐 항목을 사람이 읽을 수 있게 요약 */
export function describeChanges(before: WorkingAdmission | null, after: WorkingAdmission): string[] {
  if (!before) return ['새 항목'];
  const out: string[] = [];
  if (before.category !== after.category) out.push(`전형 유형 ${before.category ?? '-'} → ${after.category ?? '-'}`);
  if (before.quota !== after.quota) out.push(`모집인원 ${before.quota ?? '-'} → ${after.quota ?? '-'}`);
  const keys = new Set([...Object.keys(before.schedule), ...Object.keys(after.schedule)]) as Set<keyof AdmissionSchedule>;
  for (const k of keys) {
    const a = JSON.stringify(before.schedule[k] ?? null);
    const b = JSON.stringify(after.schedule[k] ?? null);
    if (a !== b) out.push(`일정 ${k} ${a} → ${b}`);
  }
  for (const h of after.history) {
    const p = before.history.find((x) => x.year === h.year);
    if (!p) out.push(`${h.year} 입시결과 추가 (모집 ${h.quota}, 충원 ${h.filled})`);
    else if (p.quota !== h.quota || p.filled !== h.filled)
      out.push(`${h.year} 입시결과 ${p.quota}/${p.filled} → ${h.quota}/${h.filled}`);
  }
  return out;
}
