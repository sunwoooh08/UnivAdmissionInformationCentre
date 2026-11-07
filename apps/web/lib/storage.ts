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
