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
