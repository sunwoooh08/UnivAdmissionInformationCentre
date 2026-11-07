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

export class RobotsDisallowedError extends Error {}

/**
 * 대학 서버에 부담을 주지 않는 요청기.
 * - robots.txt 를 지키고 (Crawl-delay 포함)
 * - 같은 호스트에는 최소 간격을 두고 한 번에 하나씩만 요청
 * - 받은 원본은 캐시해 두고 ETag/Last-Modified 로 바뀐 경우에만 다시 받는다
 * - 누가 수집하는지 User-Agent 에 연락처를 밝힌다
 */
export class PoliteFetcher {
  private readonly robots = new Map<string, Promise<RobotsRules>>();
  private readonly lastAt = new Map<string, number>();
  private readonly queue = new Map<string, Promise<unknown>>();

  constructor(
    private readonly opts: { userAgent: string; cacheDir: string; minDelayMs: number; timeoutMs?: number },
  ) {}

  get userAgent() {
    return this.opts.userAgent;
  }

  private async rulesFor(origin: string): Promise<RobotsRules> {
    let p = this.robots.get(origin);
    if (!p) {
      p = (async () => {
        try {
          const res = await this.raw(`${origin}/robots.txt`, {});
          if (res.status >= 400) return { allow: [], disallow: [], crawlDelay: null };
          return parseRobots(res.body.toString('utf8'), this.opts.userAgent);
        } catch {
          // robots.txt 를 못 읽으면 보수적으로 진행하되 기본 간격을 지킨다
          return { allow: [], disallow: [], crawlDelay: null };
        }
      })();
      this.robots.set(origin, p);
    }
    return p;
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
    const rules = await this.rulesFor(u.origin);
    if (!isAllowed(rules, u.pathname + u.search)) {
      throw new RobotsDisallowedError(`robots.txt 가 수집을 허용하지 않습니다: ${url}`);
    }
    const delay = Math.max(this.opts.minDelayMs, (rules.crawlDelay ?? 0) * 1000);

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
