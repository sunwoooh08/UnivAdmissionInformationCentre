import { join } from 'node:path';
import { todayKST, type CoverageEntry, type IngestOutcome } from '@susi/shared';
import { collectUniversity } from './collect.js';
import { CONFIG_BY_ID, CONFIGS } from './configs/index.js';
import { PoliteFetcher } from './http.js';
import { pdfToText } from './pdf.js';
import { UNIVERSITIES } from './registry/index.js';

/**
 * 사용법
 *   node dist/run.js                 전국 대학 전부 (설정된 대학만 실제로 요청) 후 API 로 전송
 *   node dist/run.js --only a,b      일부 대학만 (registry id)
 *   node dist/run.js --dry-run       전송하지 않고 결과만 출력
 *   node dist/run.js --list          대학별 설정 상태
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
const API = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}/api/admin${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.ADMIN_TOKEN ?? ''}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} 실패: HTTP ${res.status} ${await res.text()}`);
  return res.json() as Promise<unknown>;
}

async function main() {
  const unknown = CONFIGS.filter((c) => !UNIVERSITIES.some((u) => u.id === c.id)).map((c) => c.id);
  if (unknown.length) throw new Error(`대학 목록에 없는 설정: ${unknown.join(', ')}`);

  if (flag('--list')) {
    for (const u of UNIVERSITIES) {
      const c = CONFIG_BY_ID.get(u.id);
      console.log(`${u.id.padEnd(20)} ${(c?.status ?? 'unconfigured').padEnd(17)} ${u.name}${c?.note ? ` — ${c.note}` : ''}`);
    }
    return;
  }
  const contact = process.env.COLLECTOR_CONTACT;
  if (!contact) throw new Error('COLLECTOR_CONTACT 환경변수(사이트 주소나 연락용 이메일)가 필요합니다.');
  const dryRun = flag('--dry-run');
  const only = value('--only')?.split(',').map((s) => s.trim());
  const targets = only ? UNIVERSITIES.filter((u) => only.includes(u.id)) : UNIVERSITIES;
  if (only && targets.length !== only.length) throw new Error(`알 수 없는 대학 id: ${only.filter((o) => !UNIVERSITIES.some((u) => u.id === o)).join(', ')}`);

  const fetcher = new PoliteFetcher({
    userAgent: `UAIC-Collector/0.1 (+${contact})`,
    cacheDir: join(process.env.DATA_DIR ?? join(process.cwd(), 'data'), 'raw'),
    minDelayMs: Number(process.env.COLLECTOR_DELAY_MS ?? 3000),
    timeoutMs: 120_000,
  });
  const today = todayKST();
  const coverage: CoverageEntry[] = [];
  let failed = 0;

  for (const univ of targets) {
    const config = CONFIG_BY_ID.get(univ.id);
    const log = (msg: string) => console.log(`[${univ.id}] ${msg}`);
    const { drafts, coverage: cov } = await collectUniversity(univ, config, { fetcher, pdfToText, today, log });
    coverage.push(cov);
    if (config?.status === 'active') log(`상태 ${cov.status}, ${drafts.length}건`);
    if (cov.status === 'error') failed++;
    if (drafts.length === 0) continue;
    if (dryRun) {
      console.log(JSON.stringify(drafts.slice(0, 5), null, 2));
      continue;
    }
    const out = (await post('/ingest', { collector: `results.${univ.id}`, drafts })) as {
      runId: string;
      counts: Record<IngestOutcome, number>;
    };
    log(`반영 ${JSON.stringify(out.counts)} (run ${out.runId})`);
  }

  const summary: Record<string, number> = {};
  for (const c of coverage) summary[c.status] = (summary[c.status] ?? 0) + 1;
  console.log(`대학 ${coverage.length}곳: ${JSON.stringify(summary)}`);
  if (!dryRun) await post('/coverage', { entries: coverage });
  if (failed) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error((err as Error).message);
  process.exit(1);
});
