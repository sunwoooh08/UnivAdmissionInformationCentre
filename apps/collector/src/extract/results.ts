import { inferCategory, type Category, type HistoryYear } from '@susi/shared';

/**
 * 입시결과 표(pdftotext -layout 결과)를 읽는 공통 추출기.
 *
 * 대학마다 표 모양은 다르지만 공통점이 있다.
 *  - 표 위에 전형 제목 줄이 있다 (예: "▷ 학생부교과(KU지역균형)", "■ [학생부종합] Do Dream").
 *    한 줄에 제목이 둘이면 표가 좌우로 나란히 있는 것이다.
 *  - 각 행은 [단과대학] 모집단위 숫자 숫자 ... 꼴이다.
 * 그래서 대학별로는 "제목 줄 패턴"과 "모집단위 뒤 숫자 부분의 패턴"만 정해 주면 된다.
 */
export interface ResultsSpec {
  /** 전형 제목 줄. g 플래그 필수. 이름 그룹: track(필수), category(선택) */
  section: RegExp;
  /**
   * 모집단위 뒤 숫자 부분(칸 사이 공백은 한 칸으로 정리됨)에 맞출 패턴. 처음 맞는 것을 쓴다.
   * 이름 그룹:
   *   quotaYYYY(그 해 모집인원), filledYYYY(충원인원·충원합격순위), rateYYYY(충원율 %)
   *   quotaNow(올해 모집인원 — 모집요강 표)
   *   m0, m1, …(행렬 표: matrix 에 적은 전형 순서대로 그 전형의 올해 모집인원)
   */
  rows: { tracks?: RegExp; pattern: RegExp }[];
  /**
   * 행렬 표(행=모집단위, 열=전형)일 때 열 순서대로의 전형명. 행 패턴의 m0, m1 … 그룹과 짝을 이룬다.
   * '-' 이거나 0 인 칸은 그 전형에서 뽑지 않는 것으로 본다. 빈 칸이 '-' 없이 비어 있는 표는
   * 칸 수로는 열을 알 수 없으므로 이 방식 대신 guide.positionedQuotas(PDF 좌표)를 쓴다.
   */
  matrix?: string[];
  /** 모집단위로 보지 않을 칸 (합계 등) */
  skipDept?: RegExp;
  /** 전형명 정리 */
  renameTrack?: (raw: string) => string;
  /** 이 전형은 건너뜀 */
  skipTrack?: RegExp;
  /** 모집단위 칸을 찾기 전에 버릴 칸 (예: 계열 '인문' '자연') */
  ignoreCells?: RegExp;
  /** true 면 제목 말고 다른 글자가 없는 줄만 제목 줄로 본다 (각주 속 전형명 무시) */
  sectionAlone?: boolean;
  /**
   * 제목 표시 기호 (예: /^\s*■/). 이 기호로 시작하는데 section 에 맞지 않는 줄을 만나면
   * 지금 전형을 끝낸다. 모르는 표의 행이 앞 전형에 잘못 붙는 것을 막는다.
   */
  sectionMarker?: RegExp;
  /** 이 줄을 만나면 지금 전형을 끝낸다. 기본값은 정시·수능 위주 표의 시작 */
  sectionEnd?: RegExp;
  /**
   * 전형별 장(章) 제목 (예: "종합   Do Dream      655명"). 이름 그룹: track, category.
   * 이것을 쓰면 표의 전형명은 장 제목에서 오고, section 은 표의 위치(좌우 패널)만 정한다.
   */
  chapter?: RegExp;
  /** 장 제목처럼 생겼지만 chapter 에 맞지 않는 줄 → 지금 장을 끝낸다 (모르는 장의 표가 앞 전형에 붙지 않게) */
  chapterMarker?: RegExp;
}

export interface ExtractedRow {
  track: string;
  category: Category;
  dept: string;
  history: HistoryYear[];
  /** 올해 모집인원 (모집요강) */
  currentQuota?: number;
}

export interface ExtractResult {
  rows: ExtractedRow[];
  /** 모집단위와 숫자가 있는데 패턴에 맞지 않은 줄 (진단용) */
  unmatched: { track: string; line: string }[];
}

interface Panel {
  start: number;
  track: string | null;
  category: Category | null;
}

const DEFAULT_SKIP =
  /^(계|합계|소계|총계|전체|모집단위|단과대학|대학|학부|계열|구분|평균|비고|-)$|(^|\s)(계|합계|소계|총계)$|학년도|입학전형|입시결과|선발결과|전형결과|^(인문|자연|상경|예체능|예능|체능|통합|공학|의약|의학|사범|사회|인문사회|자연과학|인문\/자연|자연\/인문)$/;
/** 수시 표가 끝나고 정시·수능 표가 시작되는 줄 */
const DEFAULT_SECTION_END = /정시|수능\s*위주|수능\s*성적|수능전형|수능\s*\(/;
const NUMERIC_CELL = /^[-–]$|^\d[\d,.]*(\s*:\s*1)?%?\*?명?$/;

function cleanTrack(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanDept(s: string): string {
  let d = s
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/^\(\s*\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2}\s*\)\s*/, '') // 고사 시간 (09:30~11:00)
    .replace(/[\d)]+\)$/, '') // 각주 번호 1) 2)
    .replace(/[†‡*※◆◇●○■□▲△]+$/u, '') // 표시 기호
    .replace(/\s+(광역화|신설|폐지|변경|통합|모집중지)$/, '') // 변경 표시
    .trim();
  // "경찰사법 경찰행정학부"처럼 한 칸 띄고 붙은 단과대학 약칭을 뗀다
  const parts = d.split(' ');
  if (parts.length === 2 && (parts[0]?.length ?? 99) <= 5 && /(학과|학부|과|부|전공|과정)(\([^)]*\))?$/.test(parts[1] ?? '')) {
    d = parts[1] ?? d;
  }
  return d;
}

function toInt(s: string | undefined): number | null {
  if (s === undefined) return null;
  const t = s.replace(/[,\s]/g, '').replace(/\*+$/, '').replace(/명$/, ''); // '10*', '65명'
  return /^\d+$/.test(t) ? Number(t) : null;
}

function toRate(s: string | undefined): number | null {
  if (s === undefined) return null;
  const t = s.replace(/[%\s,]/g, '');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

/** 이름 그룹(quota2026, filled2026, rate2026 …)으로 연도별 이력을 만든다 */
function historyFrom(groups: Record<string, string | undefined>): HistoryYear[] {
  const years = new Set<number>();
  for (const k of Object.keys(groups)) {
    const m = /^(quota|filled|rate)(\d{4})$/.exec(k);
    if (m && groups[k] !== undefined) years.add(Number(m[2]));
  }
  const out: HistoryYear[] = [];
  for (const year of [...years].sort((a, b) => b - a)) {
    const quota = toInt(groups[`quota${year}`]);
    let filled = toInt(groups[`filled${year}`]);
    if (filled === null) {
      const rate = toRate(groups[`rate${year}`]);
      // 충원율 = 충원인원 ÷ 모집인원 × 100
      if (rate !== null && quota) filled = Math.round((quota * rate) / 100);
    }
    if (filled === null) continue; // 충원 값이 없거나 '-' (비공개)
    out.push({ year, quota, filled });
  }
  return out;
}

/** 줄을 패널 경계에서 자른다. 경계가 글자 중간이면 왼쪽 공백까지 물린다. */
function slicePanels(line: string, panels: Panel[]): string[] {
  const cuts = panels.map((p, i) => {
    if (i === 0) return 0;
    let c = Math.max(0, p.start - 2);
    while (c > 0 && line[c - 1] !== undefined && line[c - 1] !== ' ') c--;
    return c;
  });
  return panels.map((_, i) => line.slice(cuts[i], cuts[i + 1] ?? line.length));
}

export function extractResults(text: string, spec: ResultsSpec): ExtractResult {
  if (!spec.section.flags.includes('g')) throw new Error('section 패턴에는 g 플래그가 필요합니다.');
  const rows: ExtractedRow[] = [];
  const unmatched: ExtractResult['unmatched'] = [];
  const skipDept = spec.skipDept ?? DEFAULT_SKIP;
  let panels: Panel[] = [];
  let chapter: { track: string; category: Category } | null = null;

  for (const rawLine of text.split(/\r?\n|\f/)) {
    const line = rawLine.replace(/\t/g, '    ');
    if (spec.chapter) {
      const m = spec.chapter.exec(line);
      if (m) {
        const track = (spec.renameTrack ?? cleanTrack)(cleanTrack(m.groups?.track ?? m[0]));
        chapter = { track, category: m.groups?.category ? inferCategory(m.groups.category) : inferCategory(track) };
        panels = [];
        continue;
      }
      if (spec.chapterMarker?.test(line)) {
        chapter = null;
        panels = [];
        continue;
      }
    }
    if ((spec.sectionEnd ?? DEFAULT_SECTION_END).test(line)) {
      panels = [];
      continue;
    }
    const sections = [...line.matchAll(spec.section)];
    if (sections.length === 0 && spec.sectionMarker?.test(line)) {
      panels = [];
      continue;
    }
    if (sections.length > 0 && spec.sectionAlone && !/^[\s\d.]*$/.test(line.replace(spec.section, ''))) continue;
    if (sections.length > 0) {
      panels = sections.map((m, i) => {
        const start = i === 0 ? 0 : (m.index ?? 0);
        if (spec.chapter) return { start, track: chapter?.track ?? null, category: chapter?.category ?? null };
        const raw = m.groups?.track ?? m[0];
        const track = (spec.renameTrack ?? cleanTrack)(cleanTrack(raw));
        const catText = m.groups?.category;
        return {
          start,
          track,
          category: catText ? inferCategory(catText) : inferCategory(track),
        };
      });
      continue;
    }
    if (panels.length === 0 || !/\d/.test(line)) continue;

    slicePanels(line, panels).forEach((segment, i) => {
      const panel = panels[i];
      if (!panel?.track || (spec.skipTrack && spec.skipTrack.test(panel.track))) return;
      const cells = segment
        .trim()
        .split(/\s{2,}/)
        .filter((c) => c && !(spec.ignoreCells && spec.ignoreCells.test(c)));
      // 앞 패널에서 넘어온 숫자 조각은 건너뛰고, 글자 칸 다음에 처음 나오는 숫자 칸을 찾는다
      const firstText = cells.findIndex((c) => !NUMERIC_CELL.test(c));
      if (firstText < 0) return;
      const k = cells.findIndex((c, idx) => idx > firstText && NUMERIC_CELL.test(c));
      if (k <= 0) return;
      const dept = cleanDept(cells[k - 1] ?? '');
      if (!/[가-힣A-Za-z]/.test(dept) || skipDept.test(dept)) return;
      const rest = cells.slice(k).join(' ').replace(/\s+/g, ' ');
      const rule = spec.rows.find((r) => (!r.tracks || r.tracks.test(panel.track ?? '')) && r.pattern.test(rest));
      const groups = rule ? (rest.match(rule.pattern)?.groups ?? {}) : null;
      if (!groups) {
        unmatched.push({ track: panel.track, line: segment.trim() });
        return;
      }
      if (spec.matrix) {
        // 행렬 표: 열마다 다른 전형
        spec.matrix.forEach((track, idx) => {
          const n = toInt(groups[`m${idx}`]);
          if (!track || n === null || n <= 0) return;
          rows.push({ track, category: inferCategory(track), dept, history: [], currentQuota: n });
        });
        return;
      }
      const history = historyFrom(groups);
      const currentQuota = toInt(groups.quotaNow) ?? undefined;
      if (history.length === 0 && currentQuota === undefined) return;
      rows.push({
        track: panel.track,
        category: panel.category ?? inferCategory(panel.track),
        dept,
        history,
        ...(currentQuota !== undefined && currentQuota > 0 ? { currentQuota } : {}),
      });
    });
  }
  return { rows: dedupe(rows), unmatched };
}

/** 같은 (전형, 모집단위)가 여러 번 나오면 (쪽 머리글 반복 등) 처음 것만 둔다 */
function dedupe(rows: ExtractedRow[]): ExtractedRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.track}|${r.dept}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
