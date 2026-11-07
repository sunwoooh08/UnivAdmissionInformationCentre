import { join } from 'node:path';
import { todayKST, type AdmissionDraft, type IngestOutcome } from '@susi/shared';
import { ADAPTERS } from './adapters/index.js';
import { PoliteFetcher } from './http.js';
import { pdfToText } from './pdf.js';

/**
 * 사용법
 *   node dist/run.js                 등록된 수집기 전부 실행 후 API 로 전송
 *   node dist/run.js --only a,b      일부만
 *   node dist/run.js --dry-run       전송하지 않고 결과만 출력
 *   node dist/run.js --list          수집기 목록
 *
 * 환경변수
 *   API_INTERNAL_URL   (기본 http://127.0.0.1:4000)
 *   ADMIN_TOKEN        API 의 ADMIN_TOKEN
 *   DATA_DIR           원본 캐시 위치 (DATA_DIR/raw)
 *   COLLECTOR_CONTACT  User-Agent 에 넣을 연락처 URL 또는 이메일 (필수)
 *   COLLECTOR_DELAY_MS 같은 호스트 요청 간 최소 간격 (기본 3000)
 */
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  if (flag('--list')) {
    for (const a of ADAPTERS) console.log(`${a.id.padEnd(28)} ${a.univ}  ${a.description}`);
    return;
  }
  const contact = process.env.COLLECTOR_CONTACT;
  if (!contact) throw new Error('COLLECTOR_CONTACT 환경변수(사이트 주소나 연락용 이메일)가 필요합니다.');
  const dryRun = flag('--dry-run');
  const only = value('--only')?.split(',').map((s) => s.trim());
  const adapters = only ? ADAPTERS.filter((a) => only.includes(a.id)) : ADAPTERS;
  if (only && adapters.length !== only.length) {
    const known = new Set(ADAPTERS.map((a) => a.id));
    throw new Error(`알 수 없는 수집기: ${only.filter((o) => !known.has(o)).join(', ')}`);
  }

  const fetcher = new PoliteFetcher({
    userAgent: `UAIC-Collector/0.1 (+${contact})`,
    cacheDir: join(process.env.DATA_DIR ?? join(process.cwd(), 'data'), 'raw'),
    minDelayMs: Number(process.env.COLLECTOR_DELAY_MS ?? 3000),
  });
  const today = todayKST();
  let failed = 0;

  for (const adapter of adapters) {
    const started = Date.now();
    const log = (msg: string) => console.log(`[${adapter.id}] ${msg}`);
    let drafts: AdmissionDraft[];
    try {
      drafts = await adapter.run({ fetcher, pdfToText, today, log });
    } catch (err) {
      failed++;
      console.error(`[${adapter.id}] 실패: ${(err as Error).message}`);
      continue;
    }
    log(`${drafts.length}건 수집 (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    if (dryRun) {
      console.log(JSON.stringify(drafts, null, 2));
      continue;
    }
    if (drafts.length === 0) continue;
    const res = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000'}/api/admin/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.ADMIN_TOKEN ?? ''}` },
      body: JSON.stringify({ collector: adapter.id, drafts }),
    });
    if (!res.ok) {
      failed++;
      console.error(`[${adapter.id}] API 전송 실패: HTTP ${res.status} ${await res.text()}`);
      continue;
    }
    const out = (await res.json()) as { runId: string; counts: Record<IngestOutcome, number> };
    log(`반영 ${JSON.stringify(out.counts)} (run ${out.runId})`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error((err as Error).message);
  process.exit(1);
});
