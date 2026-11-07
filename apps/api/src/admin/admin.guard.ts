import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

const DEFAULT_ALLOWED = ['127.0.0.1', '::1'];

/**
 * 어드민 API 접근 제어.
 * 1) TCP 연결 상대 주소(프록시 헤더가 아닌 실제 소켓 주소)가 ADMIN_ALLOWED_IPS 에 있어야 하고
 * 2) Authorization: Bearer <ADMIN_TOKEN> 이 일치해야 한다.
 * 조건이 하나라도 맞지 않거나 ADMIN_TOKEN 이 비어 있으면 경로가 없는 것처럼 404를 돌려준다.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly allowed = new Set(
    (process.env.ADMIN_ALLOWED_IPS ?? DEFAULT_ALLOWED.join(','))
      .split(',')
      .map((s) => normalizeIp(s.trim()))
      .filter(Boolean),
  );

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const expected = process.env.ADMIN_TOKEN ?? '';
    const peer = normalizeIp(req.socket.remoteAddress ?? '');
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (expected.length < 32 || !this.allowed.has(peer) || !safeEqual(token, expected)) {
      throw new NotFoundException();
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** "::ffff:10.0.0.5" → "10.0.0.5" */
function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
