import { spawn } from 'node:child_process';

/** pdftotext(poppler-utils)로 PDF 를 표 모양을 유지한 텍스트로 바꾼다. */
export function pdfToText(pdf: Buffer, opts: { layout?: boolean; firstPage?: number; lastPage?: number } = {}): Promise<string> {
  const args = [opts.layout === false ? '-raw' : '-layout', '-enc', 'UTF-8'];
  if (opts.firstPage) args.push('-f', String(opts.firstPage));
  if (opts.lastPage) args.push('-l', String(opts.lastPage));
  args.push('-', '-');
  return new Promise((resolve, reject) => {
    const p = spawn('pdftotext', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    p.stdout.on('data', (d: Buffer) => out.push(d));
    p.stderr.on('data', (d: Buffer) => err.push(d));
    p.on('error', (e) => reject(new Error(`pdftotext 실행 실패 (poppler-utils 설치 필요): ${e.message}`)));
    p.on('close', (code) =>
      code === 0 ? resolve(Buffer.concat(out).toString('utf8')) : reject(new Error(`pdftotext 종료 코드 ${code}: ${Buffer.concat(err).toString()}`)),
    );
    p.stdin.end(pdf);
  });
}

export interface PdfWord {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface PdfPage {
  width: number;
  height: number;
  words: PdfWord[];
}

/** pdftotext -bbox 로 쪽마다 단어와 좌표(pt)를 얻는다 */
export function pdfToWords(pdf: Buffer): Promise<PdfPage[]> {
  return new Promise((resolve, reject) => {
    const p = spawn('pdftotext', ['-bbox', '-enc', 'UTF-8', '-', '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    p.stdout.on('data', (d: Buffer) => out.push(d));
    p.on('error', (e) => reject(new Error(`pdftotext 실행 실패 (poppler-utils 설치 필요): ${e.message}`)));
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`pdftotext 종료 코드 ${code}`));
      const html = Buffer.concat(out).toString('utf8');
      const pages: PdfPage[] = [];
      for (const pm of html.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)) {
        const words: PdfWord[] = [];
        for (const wm of (pm[3] ?? '').matchAll(
          /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g,
        )) {
          words.push({
            x0: Number(wm[1]),
            y0: Number(wm[2]),
            x1: Number(wm[3]),
            y1: Number(wm[4]),
            text: decode(wm[5] ?? ''),
          });
        }
        pages.push({ width: Number(pm[1]), height: Number(pm[2]), words });
      }
      resolve(pages);
    });
    p.stdin.end(pdf);
  });
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
