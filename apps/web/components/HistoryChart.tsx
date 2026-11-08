'use client';

import { fillRate, sortHistory, type HistoryYear } from '@susi/shared';

const W = 420;
const H = 220;
const PAD = { top: 22, right: 8, bottom: 44, left: 32 };

/** 연도별 모집인원(회색) 대비 충원인원(진한색) */
export function HistoryChart({ history }: { history: HistoryYear[] }) {
  const hs = sortHistory(history).reverse();
  if (hs.length === 0) return <p className="empty">충원 이력이 없습니다.</p>;
  const max = Math.max(...hs.flatMap((h) => [h.quota ?? 0, h.filled]), 1);
  const top = niceMax(max);
  const plotH = H - PAD.top - PAD.bottom;
  const plotW = W - PAD.left - PAD.right;
  const groupW = plotW / hs.length;
  const barW = Math.min(28, groupW / 3);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const grid = [0, top / 2, top];

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="연도별 모집인원과 충원인원">
        {grid.map((g) => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)} stroke="var(--line)" />
            <text x={PAD.left - 6} y={y(g) + 4} textAnchor="end">{Math.round(g)}</text>
          </g>
        ))}
        {hs.map((h, i) => {
          const cx = PAD.left + groupW * i + groupW / 2;
          return (
            <g key={h.year}>
              {h.quota !== null && (
                <>
                  <rect x={cx - barW - 2} y={y(h.quota)} width={barW} height={y(0) - y(h.quota)} fill="var(--bar)" />
                  <text x={cx - barW / 2 - 2} y={y(h.quota) - 5} textAnchor="middle">{h.quota}</text>
                </>
              )}
              <rect x={cx + 2} y={y(h.filled)} width={barW} height={y(0) - y(h.filled)} fill="var(--ink)" />
              <text x={cx + barW / 2 + 2} y={y(h.filled) - 5} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 600 }}>
                {h.filled}
              </text>
              <text x={cx} y={H - PAD.bottom + 16} textAnchor="middle" style={{ fill: 'var(--ink)' }}>{h.year}학년도</text>
              <text x={cx} y={H - PAD.bottom + 32} textAnchor="middle">
                {fillRate(h) === null ? '모집인원 미공개' : `충원율 ${Math.round((fillRate(h) ?? 0) * 100)}%`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span><svg width={12} height={12} aria-hidden><rect width={12} height={12} fill="var(--bar)" /></svg>모집인원</span>
        <span><svg width={12} height={12} aria-hidden><rect width={12} height={12} fill="var(--ink)" /></svg>충원인원</span>
      </div>
    </div>
  );
}

function niceMax(v: number) {
  const step = v <= 10 ? 2 : v <= 50 ? 10 : v <= 100 ? 20 : 50;
  return Math.ceil((v * 1.1) / step) * step;
}
