import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AccessLogService, type AccessAction } from './access-log.service.js';

/** 공개 API 호출(검색·조회·계산·등록)을 모두 기록한다. 헬스체크와 어드민 API는 제외. */
@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  constructor(private readonly log: AccessLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const path = req.path;
    const action = classify(req.method, path);
    if (!action) return next.handle();

    const started = Date.now();
    const write = (status: number) =>
      this.log.record({
        at: new Date().toISOString(),
        action,
        method: req.method,
        path,
        query: flattenQuery(req.query),
        admissionId: typeof req.params?.id === 'string' ? req.params.id : null,
        status,
        durationMs: Date.now() - started,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

    return next.handle().pipe(
      tap({
        next: () => write(res.statusCode),
        error: (err: unknown) => write(err instanceof HttpException ? err.getStatus() : 500),
      }),
    );
  }
}

function classify(method: string, path: string): AccessAction | null {
  if (!path.startsWith('/api/')) return null;
  if (path.startsWith('/api/admin') || path.startsWith('/api/health')) return null;
  if (path === '/api/schedule') return 'schedule';
  if (path === '/api/reports' && method === 'POST') return 'report';
  if (!path.startsWith('/api/admissions') || method !== 'GET') return null;
  if (path.endsWith('/outlook')) return 'outlook';
  if (path === '/api/admissions/stats') return null;
  return path === '/api/admissions' ? 'search' : 'view';
}

function flattenQuery(q: Request['query']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q ?? {})) {
    if (typeof v === 'string') out[k] = v.slice(0, 200);
    else if (Array.isArray(v)) out[k] = v.map(String).join(',').slice(0, 200);
  }
  return out;
}
