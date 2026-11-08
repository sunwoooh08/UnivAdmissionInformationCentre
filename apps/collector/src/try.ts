import { readFileSync } from 'node:fs';
import { CONFIG_BY_ID, CONFIG_ERRORS } from './configs/index.js';
import { extractResults, type ResultsSpec } from './extract/results.js';
import { pdfToText } from './pdf.js';

/**
 * 설정을 내려받은 PDF 로 시험한다 (네트워크 사용 안 함).
 *   node dist/try.js <id> --results <n> <file.pdf>    results[n] 설정으로 입시결과 파일 읽기
 *   node dist/try.js <id> --guide <file.pdf>          모집요강의 모집인원 표 읽기
 *   --all 을 붙이면 모든 행을 출력
 */
const [id, mode, a, b] = process.argv.slice(2);
const showAll = process.argv.includes('--all');
for (const e of CONFIG_ERRORS) console.error(`설정 파일 오류 ${e.file}: ${e.error}`);
const config = id ? CONFIG_BY_ID.get(id) : undefined;
if (!config) {
  console.error(`설정 없음: ${id}`);
  process.exit(1);
}

let specs: ResultsSpec[] = [];
let file: string | undefined;
let years: number[] | null = null;
if (mode === '--results') {
  const src = config.results?.[Number(a)];
  if (!src) throw new Error(`results[${a}] 없음`);
  specs = [src.spec];
  years = src.years;
  file = b;
} else if (mode === '--guide') {
  specs = config.guide?.quotas ?? [];
  file = a;
} else {
  console.error('사용법: try.js <id> --results <n> <file.pdf> | --guide <file.pdf>');
  process.exit(1);
}
if (!file) throw new Error('PDF 파일 경로가 필요합니다.');

const text = await pdfToText(readFileSync(file));
for (const [i, spec] of specs.entries()) {
  const { rows, unmatched } = extractResults(text, spec);
  const byTrack: Record<string, number> = {};
  for (const r of rows) byTrack[`${r.category} | ${r.track}`] = (byTrack[`${r.category} | ${r.track}`] ?? 0) + 1;
  console.log(`\n[spec ${i}] ${rows.length}행, 형식 불일치 ${unmatched.length}줄`);
  for (const [k, v] of Object.entries(byTrack)) console.log(`  ${v.toString().padStart(4)}  ${k}`);
  const yearsSeen = new Set(rows.flatMap((r) => r.history.map((h) => h.year)));
  if (years && [...yearsSeen].some((y) => !years.includes(y))) console.log(`  ! 설정 years(${years}) 밖의 학년도: ${[...yearsSeen]}`);
  console.log('  예시:');
  for (const r of showAll ? rows : rows.slice(0, 8)) {
    const h = r.history.map((x) => `${x.year}: 모집 ${x.quota ?? '?'} 충원 ${x.filled}`).join(' / ');
    console.log(`    ${r.track} | ${r.dept} | ${r.currentQuota !== undefined ? `올해 모집 ${r.currentQuota}` : ''} ${h}`);
  }
  if (unmatched.length) {
    console.log('  형식 불일치 줄(앞 12개):');
    for (const u of unmatched.slice(0, 12)) console.log(`    ? ${u.track} | ${u.line.slice(0, 150)}`);
  }
}
