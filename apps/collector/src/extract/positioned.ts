import { inferCategory } from '@susi/shared';
import type { PdfPage, PdfWord } from '../pdf.js';
import type { ExtractedRow, ExtractResult } from './results.js';

/**
 * 빈 칸에 '-' 를 찍지 않는 행렬 표(행=모집단위, 열=전형)를 PDF 좌표로 읽는다.
 * 머리글 단어(예: '서류형')의 가운데 x 좌표 아래에 있는 숫자를 그 전형의 모집인원으로 본다.
 * 행 합계 열('계')이 있으면 전형별 숫자의 합과 맞는 행만 받는다 — 위치를 잘못 읽으면 걸러진다.
 */
export interface PositionedMatrixSpec {
  /** 이 글이 있는 쪽만 읽는다 (예: /모집인원\s*-\s*총괄표/) */
  page: RegExp;
  /** 열 순서대로의 전형명 ('' 이면 그 열은 읽지 않음) */
  matrix: string[];
  /** 열마다 머리글 단어. 같은 단어가 여러 번이면 '추천형#2' (왼쪽부터 두 번째) */
  headers: string[];
  /** 행 합계 열의 머리글 단어 (권장) */
  totalHeader?: string;
  /** 모집단위로 보지 않을 단어 (계열 등) */
  ignoreWords?: RegExp;
  /** 숫자와 머리글 가운데 사이 허용 거리(pt). 기본은 이웃 열 간격의 절반 */
  tolerance?: number;
  /** 한 PDF 쪽에 두 쪽이 펼쳐져 있으면 true: 왼쪽 절반과 오른쪽 절반을 따로 읽는다 */
  pageHalves?: boolean;
  /**
   * 칸 값의 뜻. 기본 'quota'(올해 모집인원). 'filled' 이면 year 학년도의 충원인원(충원합격 순위)으로 읽는다
   * (입시결과의 '모집단위 × 전형' 충원 표). 합계 열이 없는 표는 totalHeader 를 비워 둔다.
   */
  field?: 'quota' | 'filled';
  year?: number;
}

interface Line {
  y: number;
  words: PdfWord[];
}

const isNumber = (w: PdfWord) => /^\d+$/.test(w.text);
const center = (w: PdfWord) => (w.x0 + w.x1) / 2;

function groupLines(words: PdfWord[]): Line[] {
  const sorted = [...words].sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2 || a.x0 - b.x0);
  const lines: Line[] = [];
  for (const w of sorted) {
    const y = (w.y0 + w.y1) / 2;
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - y) <= 2.5) last.words.push(w);
    else lines.push({ y, words: [w] });
  }
  for (const l of lines) l.words.sort((a, b) => a.x0 - b.x0);
  return lines;
}

function findHeader(words: PdfWord[], label: string): number | null {
  const [text, nth] = label.split('#') as [string, string | undefined];
  const hits = words.filter((w) => w.text === text).sort((a, b) => a.x0 - b.x0);
  const w = hits[Number(nth ?? 1) - 1];
  return w ? center(w) : null;
}

export function extractPositionedMatrix(pages: PdfPage[], spec: PositionedMatrixSpec): ExtractResult {
  if (spec.headers.length !== spec.matrix.length) throw new Error('headers 와 matrix 의 길이가 다릅니다.');
  if (spec.field === 'filled' && !spec.year) throw new Error("field: 'filled' 에는 year 가 필요합니다.");
  const rows: ExtractedRow[] = [];
  const unmatched: ExtractResult['unmatched'] = [];
  const seen = new Set<string>();

  const regions: PdfPage[] = pages.flatMap((page) =>
    spec.pageHalves
      ? [
          { ...page, words: page.words.filter((w) => w.x1 <= page.width / 2) },
          { ...page, words: page.words.filter((w) => w.x0 >= page.width / 2) },
        ]
      : [page],
  );

  for (const page of regions) {
    const pageText = page.words.map((w) => w.text).join(' ');
    if (!spec.page.test(pageText.replace(/\s+/g, ' '))) continue;

    // 머리글 줄: 머리글 단어가 가장 많이 들어 있는 줄. 그 줄에 없는 머리글은 위아래 40pt 안에서 찾는다
    const lines = groupLines(page.words);
    const labelText = (l: string) => l.split('#')[0] ?? '';
    const wanted = new Set([...spec.headers, spec.totalHeader ?? ''].filter(Boolean).map(labelText));
    let headerLine: Line | null = null;
    let headerScore = 1;
    for (const l of lines) {
      const score = new Set(l.words.filter((w) => wanted.has(w.text)).map((w) => w.text)).size;
      if (score > headerScore) {
        headerScore = score;
        headerLine = l;
      }
    }
    if (!headerLine) continue;
    const hl = headerLine;
    const around = page.words.filter((w) => !isNumber(w) && Math.abs((w.y0 + w.y1) / 2 - hl.y) <= 40);
    const locate = (label: string) => findHeader(hl.words, label) ?? findHeader(around, label);
    const cols = spec.headers.map((h) => (h ? locate(h) : null));
    const total = spec.totalHeader ? locate(spec.totalHeader) : null;
    const known = cols.filter((c): c is number => c !== null).sort((a, b) => a - b);
    if (known.length < 2) continue;
    const firstCol = known[0] ?? 0;
    const lastCol = known[known.length - 1] ?? 0;
    const gaps = known.slice(1).map((c, i) => c - (known[i] ?? 0)).filter((g) => g > 0.5);
    const tolerance = spec.tolerance ?? Math.max(4, Math.min(...gaps) / 2);
    const minX = Math.min(firstCol, total ?? firstCol) - tolerance * 2;
    const maxX = Math.max(lastCol, total ?? lastCol) + tolerance * 2;

    let prev: { x0: number; rows: ExtractedRow[] } | null = null;
    for (const line of lines) {
      if (line.y <= hl.y + 2) continue;
      const nums = line.words.filter((w) => isNumber(w) && center(w) >= minX && center(w) <= maxX);
      if (nums.length === 0) {
        // 다음 줄로 넘어간 모집단위 이름의 뒷부분 (예: "(전기공학전공)")
        const head = line.words[0];
        if (prev && head && head.text.startsWith('(') && Math.abs(head.x0 - prev.x0) < 25) {
          const tail = line.words.filter((w) => Math.abs(w.y0 - head.y0) < 3 && w.x0 < prev!.x0 + 120).map((w) => w.text).join('');
          for (const r of prev.rows) {
            seen.delete(`${r.track}|${r.dept}`);
            r.dept = `${r.dept}${tail}`;
            seen.add(`${r.track}|${r.dept}`);
          }
        }
        prev = null;
        continue;
      }
      // 모집단위: 첫 숫자 왼쪽에서 붙어 있는 글자 단어들
      const firstNumX = Math.min(...nums.map((w) => w.x0));
      const left = line.words.filter(
        (w) => w.x1 <= firstNumX && w.x1 >= minX - 250 && !isNumber(w) && !(spec.ignoreWords?.test(w.text) ?? false),
      );
      const parts: PdfWord[] = [];
      for (let i = left.length - 1; i >= 0; i--) {
        const w = left[i]!;
        const next = parts[0];
        if (next && next.x0 - w.x1 > 4) break;
        parts.unshift(w);
      }
      let stacked = false;
      if (parts.length === 0) {
        // 이름이 두 줄이라 숫자가 그 사이 높이에 있는 행: 위아래 9pt 안의 같은 칸 글자를 위에서부터 잇는다
        const near = page.words.filter(
          (w) =>
            !isNumber(w) &&
            w.x1 <= firstNumX &&
            w.x1 >= minX - 250 &&
            Math.abs((w.y0 + w.y1) / 2 - line.y) <= 9 &&
            !(spec.ignoreWords?.test(w.text) ?? false),
        );
        const rightmost = near.reduce<PdfWord | null>((a, w) => (!a || w.x1 > a.x1 ? w : a), null);
        if (rightmost) {
          parts.push(
            ...near
              .filter((w) => Math.abs(center(w) - center(rightmost)) <= 40)
              .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0),
          );
          stacked = parts.length > 1;
        }
      }
      const deptX0 = parts[0]?.x0 ?? 0;
      const dept = parts
        .map((w) => w.text)
        .join(stacked ? '' : ' ')
        .replace(/[*†‡※]+$/u, '')
        .trim();
      if (!dept || !/[가-힣A-Za-z]/.test(dept)) continue;

      const values: (number | null)[] = cols.map(() => null);
      let lineTotal: number | null = null;
      let bad = false;
      for (const w of nums) {
        const c = center(w);
        if (total !== null && Math.abs(c - total) <= tolerance) {
          lineTotal = Number(w.text);
          continue;
        }
        let best = -1;
        let bestDist = Infinity;
        cols.forEach((col, i) => {
          if (col === null) return;
          const d = Math.abs(col - c);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        if (best < 0 || bestDist > tolerance) continue; // 다른 열 (예: 수시+정시 모집인원)
        if (values[best] !== null) bad = true;
        values[best] = Number(w.text);
      }
      const sum = values.reduce<number>((a, v) => a + (v ?? 0), 0);
      const raw = line.words.map((w) => w.text).join(' ');
      if (bad || sum === 0 || (spec.totalHeader && lineTotal !== sum)) {
        unmatched.push({ track: '(행렬)', line: raw });
        prev = null;
        continue;
      }
      const added: ExtractedRow[] = [];
      values.forEach((n, i) => {
        const track = spec.matrix[i];
        if (!track || n === null || (n <= 0 && spec.field !== 'filled')) return;
        const key = `${track}|${dept}`;
        if (seen.has(key)) return;
        seen.add(key);
        const row: ExtractedRow =
          spec.field === 'filled'
            ? { track, category: inferCategory(track), dept, history: [{ year: spec.year ?? 0, quota: null, filled: n }] }
            : { track, category: inferCategory(track), dept, history: [], currentQuota: n };
        rows.push(row);
        added.push(row);
      });
      prev = stacked ? null : { x0: deptX0, rows: added };
    }
  }
  return { rows, unmatched };
}
