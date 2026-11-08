import type { Admission, AdmissionInput } from '@susi/shared';

/** 내 지원 목록과 예비번호는 이 브라우저에만 저장한다. */
const KEY = 'susi.mine.v1';

export interface MineState {
  ids: string[];
  ranks: Record<string, number>;
}

export const MAX_APPLICATIONS = 6;

export function loadMine(): MineState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ids: [], ranks: {} };
    const parsed = JSON.parse(raw) as Partial<MineState>;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids.filter((x) => typeof x === 'string').slice(0, MAX_APPLICATIONS) : [],
      ranks: parsed.ranks && typeof parsed.ranks === 'object' ? parsed.ranks : {},
    };
  } catch {
    return { ids: [], ranks: {} };
  }
}

export function saveMine(state: MineState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 저장 불가(사생활 보호 모드 등) — 무시 */
  }
}

// ── 내가 직접 입력한 지원 정보 (이 브라우저에만 저장, 서버로 보내지 않음) ──

const LOCAL_KEY = 'susi.local.v1';
export const LOCAL_PREFIX = 'local-';

export function isLocal(a: Pick<Admission, 'id'>): boolean {
  return a.id.startsWith(LOCAL_PREFIX);
}

export function loadLocal(): Admission[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as Admission[]) : [];
    return Array.isArray(parsed) ? parsed.filter((a) => typeof a?.id === 'string' && isLocal(a)) : [];
  } catch {
    return [];
  }
}

export function saveLocal(list: Admission[]): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* 저장 불가 — 무시 */
  }
}

export function makeLocal(input: AdmissionInput, id?: string): Admission {
  return {
    ...input,
    id: id ?? `${LOCAL_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    sources: [],
    updatedAt: new Date().toISOString(),
  };
}
