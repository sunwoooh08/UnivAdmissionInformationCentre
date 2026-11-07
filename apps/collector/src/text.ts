/** 표 텍스트를 다루는 작은 도구들 */

/** "1,234" "12명" "-" 같은 칸을 숫자로. 숫자가 아니면 null */
export function num(cell: string | undefined): number | null {
  if (cell === undefined) return null;
  const c = cell.replace(/[,\s명]/g, '');
  if (!/^\d+$/.test(c)) return null;
  return Number(c);
}

/** pdftotext -layout 결과의 한 줄을 칸으로 나눈다 (공백 2칸 이상이 구분자) */
export function cells(line: string): string[] {
  return line.trim().split(/\s{2,}/).filter(Boolean);
}

export function squash(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** HTML 태그 제거 + 엔티티 일부 해제 */
export function stripTags(html: string): string {
  return squash(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d))),
  );
}

/** 단순 HTML 표 → 2차원 배열 (rowspan/colspan 반영) */
export function htmlTable(html: string): string[][] {
  const rows: string[][] = [];
  const spans: { col: number; left: number; text: string }[] = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const row: string[] = [];
    const cellsHtml = tr.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi) ?? [];
    let col = 0;
    const take = () => {
      while (true) {
        const s = spans.find((x) => x.col === col && x.left > 0);
        if (!s) break;
        row[col] = s.text;
        s.left--;
        col++;
      }
    };
    for (const c of cellsHtml) {
      take();
      const text = stripTags(c);
      const colspan = Number(/colspan="?(\d+)/i.exec(c)?.[1] ?? 1);
      const rowspan = Number(/rowspan="?(\d+)/i.exec(c)?.[1] ?? 1);
      for (let k = 0; k < colspan; k++) {
        row[col] = text;
        if (rowspan > 1) spans.push({ col, left: rowspan - 1, text });
        col++;
      }
    }
    take();
    for (let i = spans.length - 1; i >= 0; i--) if ((spans[i]?.left ?? 0) <= 0) spans.splice(i, 1);
    rows.push(row.map((x) => x ?? ''));
  }
  return rows;
}
