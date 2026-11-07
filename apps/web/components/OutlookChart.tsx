'use client';

import type { Outlook } from '@susi/shared';

const W = 420;
const H = 220;
const PAD = { top: 14, right: 12, bottom: 34, left: 40 };

/** 예비번호별 충원 합격 확률 곡선 */
export function OutlookChart({ outlook }: { outlook: Outlook }) {
  const pts = outlook.curve;
  const maxRank = pts.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (r: number) => PAD.left + ((r - 1) / Math.max(maxRank - 1, 1)) * plotW;
  const y = (p: number) => PAD.top + (1 - p) * plotH;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.rank).toFixed(1)},${y(p.probability).toFixed(1)}`).join(' ');
  const area = `${line} L${x(maxRank)},${y(0)} L${x(1)},${y(0)} Z`;
  const step = maxRank <= 20 ? 5 : maxRank <= 60 ? 10 : 20;
  const xticks = [1, ...Array.from({ length: Math.floor(maxRank / step) }, (_, i) => (i + 1) * step)];
  const me = outlook.rank;
  const meP = outlook.probability;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="예비번호별 합격 확률">
        {[0, 0.2, 0.5, 0.8, 1].map((g) => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeDasharray={g === 0 || g === 1 ? undefined : '2 3'} />
            <text x={PAD.left - 6} y={y(g) + 4} textAnchor="end">{Math.round(g * 100)}%</text>
          </g>
        ))}
        {xticks.map((r) => (
          <text key={r} x={x(r)} y={H - PAD.bottom + 16} textAnchor="middle">{r}</text>
        ))}
        <text x={W - PAD.right} y={H - 4} textAnchor="end">예비번호</text>
        <path d={area} fill="var(--subtle)" />
        <path d={line} fill="none" stroke="var(--ink)" strokeWidth={1.75} />
        {me <= maxRank && (
          <g>
            <line x1={x(me)} x2={x(me)} y1={y(meP)} y2={y(0)} stroke="var(--accent)" strokeDasharray="3 3" />
            <circle cx={x(me)} cy={y(meP)} r={4.5} fill="var(--accent)" />
            <text
              x={x(me) + (x(me) > W - 90 ? -8 : 8)}
              y={y(meP) - 8}
              textAnchor={x(me) > W - 90 ? 'end' : 'start'}
              style={{ fill: 'var(--accent)', fontWeight: 700 }}
            >
              {me}번 · {Math.round(meP * 100)}%
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
