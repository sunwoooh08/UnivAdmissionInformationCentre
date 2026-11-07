'use client';

import { useEffect, useRef, useState } from 'react';
import { dayNumber, type Admission, type TimelineEvent } from '@susi/shared';

interface Row {
  admission: Admission;
  events: TimelineEvent[];
}

const ROW_H = 34;
const TOP = 34;
/** 이보다 좁으면 가로 스크롤 */
const MIN_WIDTH = 600;

export function Timeline({ rows, today, selectedId, onSelect }: {
  rows: Row[];
  today: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(900);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setBoxW(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (rows.length === 0) return null;
  const WIDTH = Math.max(boxW, MIN_WIDTH);
  const LABEL_W = WIDTH < 720 ? 130 : 190;
  const nameLen = WIDTH < 720 ? 8 : 12;
  const all = rows.flatMap((r) => r.events);
  const start = Math.min(dayNumber(today), ...all.map((e) => dayNumber(e.start))) - 1;
  const end = Math.max(...all.map((e) => dayNumber(e.end))) + 2;
  const plotW = WIDTH - LABEL_W - 12;
  const x = (d: number) => LABEL_W + ((d - start) / (end - start)) * plotW;
  const height = TOP + rows.length * ROW_H + 8;

  const ticks: { d: number; label: string; month: boolean }[] = [];
  for (let d = start; d <= end; d++) {
    const date = new Date(d * 86_400_000);
    const dow = date.getUTCDay();
    const dom = date.getUTCDate();
    if (dom === 1 || dow === 1) ticks.push({ d, label: `${date.getUTCMonth() + 1}.${dom}`, month: dom === 1 });
  }
  // 월초 눈금과 너무 가까운 주 단위 눈금은 글자가 겹치므로 뺀다
  const visibleTicks = ticks.filter(
    (tk) => tk.month || !ticks.some((o) => o.month && o.d !== tk.d && Math.abs(o.d - tk.d) < 3),
  );
  const t = dayNumber(today);

  return (
    <div className="chart" ref={box}>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width={WIDTH} height={height} role="img" aria-label="지원 대학별 일정 타임라인">
        {visibleTicks.map((tk) => (
          <g key={tk.d}>
            <line x1={x(tk.d)} x2={x(tk.d)} y1={TOP - 8} y2={height - 6} stroke="var(--line)" strokeWidth={tk.month ? 1.5 : 1} />
            <text x={x(tk.d)} y={TOP - 14} textAnchor="middle" style={tk.month ? { fontWeight: 700 } : undefined}>
              {tk.label}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cy = TOP + i * ROW_H + ROW_H / 2;
          const selected = r.admission.id === selectedId;
          return (
            <g key={r.admission.id} onClick={() => onSelect(r.admission.id)} style={{ cursor: 'pointer' }}>
              <rect x={0} y={cy - ROW_H / 2} width={WIDTH} height={ROW_H} fill={selected ? 'var(--subtle)' : 'transparent'} />
              <text x={4} y={cy - 2} style={{ fontSize: 12, fontWeight: 600, fill: 'var(--ink)' }}>
                {i + 1}. {truncate(r.admission.univ, nameLen)}
              </text>
              <text x={4} y={cy + 12}>{truncate(r.admission.dept, nameLen + 4)}</text>
              <line x1={LABEL_W} x2={WIDTH - 12} y1={cy} y2={cy} stroke="var(--line)" />
              {r.events.map((e) => (
                <Mark key={e.kind} e={e} cy={cy} x={x} />
              ))}
            </g>
          );
        })}
        <line x1={x(t)} x2={x(t)} y1={TOP - 6} y2={height - 6} stroke="var(--bad)" strokeDasharray="3 3" />
        <text x={x(t) + 4} y={height - 8} style={{ fill: 'var(--bad)' }}>오늘</text>
      </svg>
      <div className="legend">
        <span><Glyph kind="first" />1단계 발표</span>
        <span><Glyph kind="exam" />면접·대학별고사</span>
        <span><Glyph kind="final" />최초합격 발표</span>
        <span><Glyph kind="register" />최초합격 등록</span>
        <span><Glyph kind="waitlist" />충원합격 통보</span>
        <span><Glyph kind="waitlistReg" />충원 등록 마감</span>
      </div>
    </div>
  );
}

function Mark({ e, cy, x }: { e: TimelineEvent; cy: number; x: (d: number) => number }) {
  const s = dayNumber(e.start);
  const en = dayNumber(e.end);
  const title = <title>{`${e.label} ${e.start.slice(5).replace('-', '.')}${e.end !== e.start ? ` ~ ${e.end.slice(5, 10).replace('-', '.')}` : ''}`}</title>;
  switch (e.kind) {
    case 'register':
      return <rect x={x(s)} y={cy - 4} width={Math.max(x(en + 1) - x(s), 4)} height={8} fill="var(--bar)">{title}</rect>;
    case 'waitlist':
      return (
        <rect x={x(s)} y={cy - 4} width={Math.max(x(en + 1) - x(s), 4)} height={8} fill="none" stroke="var(--ink-3)" strokeDasharray="2 2">
          {title}
        </rect>
      );
    case 'waitlistReg':
      return <line x1={x(s + 0.5)} x2={x(s + 0.5)} y1={cy - 8} y2={cy + 8} stroke="var(--ink-2)" strokeWidth={2}>{title}</line>;
    case 'exam':
      return (
        <rect x={x(s + 0.5) - 5} y={cy - 5} width={Math.max(x(en + 0.5) - x(s + 0.5), 0) + 10} height={10} fill="var(--ink-2)">
          {title}
        </rect>
      );
    case 'first':
      return <circle cx={x(s + 0.5)} cy={cy} r={5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5}>{title}</circle>;
    case 'final':
      return <circle cx={x(s + 0.5)} cy={cy} r={6} fill="var(--accent)">{title}</circle>;
  }
}

function Glyph({ kind }: { kind: TimelineEvent['kind'] }) {
  return (
    <svg width={18} height={12} aria-hidden>
      {kind === 'first' && <circle cx={9} cy={6} r={4} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />}
      {kind === 'exam' && <rect x={4} y={1} width={10} height={10} fill="var(--ink-2)" />}
      {kind === 'final' && <circle cx={9} cy={6} r={5} fill="var(--accent)" />}
      {kind === 'register' && <rect x={1} y={2} width={16} height={8} fill="var(--bar)" />}
      {kind === 'waitlist' && <rect x={1.5} y={2.5} width={15} height={7} fill="none" stroke="var(--ink-3)" strokeDasharray="2 2" />}
      {kind === 'waitlistReg' && <line x1={9} x2={9} y1={0} y2={12} stroke="var(--ink-2)" strokeWidth={2} />}
    </svg>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
