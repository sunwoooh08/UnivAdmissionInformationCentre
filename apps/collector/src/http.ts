import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isAllowed, parseRobots, type RobotsRules } from './robots.js';

export interface FetchResult {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
  /** 캐시에서 그대로 가져왔는지 (304) */
  fromCache: boolean;
}

/** robots.txt 가 이 경로의 수집을 금지 */
export class RobotsDisallowedError extends Error {}
/** robots.txt 를 확인할 수 없음 (5xx·접속 실패). RFC 9309 에 따라 이번에는 수집하지 않는다 */
export class RobotsUnavailableError extends Error {}

type RobotsState = { kind: 'rules'; rules: RobotsRules } | { kind: 'unavailable'; reason: string };

/**
 * 대학 서버에 부담을 주지 않는 요청기.
 * - robots.txt 를 지키고 (Crawl-delay 포함)
 * - 같은 호스트에는 최소 간격을 두고 한 번에 하나씩만 요청
 * - 받은 원본은 캐시해 두고 ETag/Last-Modified 로 바뀐 경우에만 다시 받는다
 * - 누가 수집하는지 User-Agent 에 연락처를 밝힌다
 */
export class PoliteFetcher {
  private readonly robots = new Map<string, Promise<RobotsState>>();
  private readonly lastAt = new Map<string, number>();
  private readonly queue = new Map<string, Promise<unknown>>();

  constructor(
    private readonly opts: { userAgent: string; cacheDir: string; minDelayMs: number; timeoutMs?: number },
  ) {}

  get userAgent() {
    return this.opts.userAgent;
  }

  /**
   * RFC 9309: 4xx 이면 제한 없음, 5xx·접속 실패면 전체 금지로 본다.
   */
  private async rulesFor(origin: string): Promise<RobotsState> {
    let p = this.robots.get(origin);
    if (!p) {
      p = (async (): Promise<RobotsState> => {
        try {
          const res = await this.raw(`${origin}/robots.txt`, {});
          if (res.status >= 500) return { kind: 'unavailable', reason: `robots.txt 응답 ${res.status}` };
          if (res.status >= 400) return { kind: 'rules', rules: { allow: [], disallow: [], crawlDelay: null } };
          return { kind: 'rules', rules: parseRobots(res.body.toString('utf8'), this.opts.userAgent) };
        } catch (err) {
          return { kind: 'unavailable', reason: `robots.txt 확인 실패: ${(err as Error).message}` };
        }
      })();
      this.robots.set(origin, p);
    }
    return p;
  }

  /** 이 주소를 지금 수집해도 되는지 (요청하지 않고 확인만) */
  async check(url: string): Promise<{ ok: true } | { ok: false; reason: 'disallowed' | 'unavailable'; message: string }> {
    const u = new URL(url);
    const state = await this.rulesFor(u.origin);
    if (state.kind === 'unavailable') return { ok: false, reason: 'unavailable', message: state.reason };
    if (!isAllowed(state.rules, u.pathname + u.search))
      return { ok: false, reason: 'disallowed', message: `robots.txt 가 수집을 금지: ${u.host}${u.pathname}` };
    return { ok: true };
  }

  private async raw(url: string, headers: Record<string, string>) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 30_000);
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': this.opts.userAgent, accept: '*/*', ...headers },
        redirect: 'follow',
        signal: ctrl.signal,
      });
      const body = Buffer.from(await res.arrayBuffer());
      return { status: res.status, headers: res.headers, body, url: res.url };
    } finally {
      clearTimeout(t);
    }
  }

  /** 호스트별로 순서대로, 간격을 두고 실행 */
  private serialize<T>(host: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queue.get(host) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(fn);
    this.queue.set(host, next);
    return next;
  }

  async get(url: string, init: { method?: 'GET' | 'POST'; body?: string; headers?: Record<string, string> } = {}): Promise<FetchResult> {
    const u = new URL(url);
    const state = await this.rulesFor(u.origin);
    if (state.kind === 'unavailable') throw new RobotsUnavailableError(state.reason);
    if (!isAllowed(state.rules, u.pathname + u.search)) {
      throw new RobotsDisallowedError(`robots.txt 가 수집을 금지: ${u.host}${u.pathname}`);
    }
    const delay = Math.max(this.opts.minDelayMs, (state.rules.crawlDelay ?? 0) * 1000);

    return this.serialize(u.host, async () => {
      const wait = (this.lastAt.get(u.host) ?? 0) + delay - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));

      const cacheKey = createHash('sha1').update(`${init.method ?? 'GET'} ${url} ${init.body ?? ''}`).digest('hex');
      const dir = join(this.opts.cacheDir, u.host);
      const metaPath = join(dir, `${cacheKey}.json`);
      const bodyPath = join(dir, `${cacheKey}.bin`);
      let meta: { etag?: string; lastModified?: string; contentType: string } | null = null;
      try {
        meta = JSON.parse(await readFile(metaPath, 'utf8'));
      } catch {
        meta = null;
      }

      const headers: Record<string, string> = { ...init.headers };
      if (meta?.etag) headers['if-none-match'] = meta.etag;
      if (meta?.lastModified) headers['if-modified-since'] = meta.lastModified;

      let lastErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 30_000);
          const res = await fetch(url, {
            method: init.method ?? 'GET',
            body: init.body,
            headers: { 'user-agent': this.opts.userAgent, ...headers },
            redirect: 'follow',
            signal: ctrl.signal,
          }).finally(() => clearTimeout(t));
          this.lastAt.set(u.host, Date.now());

          if (res.status === 304 && meta) {
            return { url, status: 200, contentType: meta.contentType, body: await readFile(bodyPath), fromCache: true };
          }
          if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
          const body = Buffer.from(await res.arrayBuffer());
          const contentType = res.headers.get('content-type') ?? '';
          if (res.ok) {
            await mkdir(dir, { recursive: true });
            await writeFile(bodyPath, body);
            await writeFile(
              metaPath,
              JSON.stringify({
                url,
                etag: res.headers.get('etag') ?? undefined,
                lastModified: res.headers.get('last-modified') ?? undefined,
                contentType,
                fetchedAt: new Date().toISOString(),
              }),
            );
          }
          return { url, status: res.status, contentType, body, fromCache: false };
        } catch (err) {
          lastErr = err;
          this.lastAt.set(u.host, Date.now());
          await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    });
  }

  async text(url: string, init?: Parameters<PoliteFetcher['get']>[1]): Promise<string> {
    const r = await this.get(url, init);
    if (r.status >= 400) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.body.toString('utf8');
  }
}
