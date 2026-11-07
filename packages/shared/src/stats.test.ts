import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOutlook, estimateFilled, normalCdf, passProbability } from './stats.js';
import { admissionEvents, daysUntil, formatDday } from './dates.js';
import type { Admission, CommonSchedule } from './types.js';

test('normalCdf matches known values', () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 1e-3);
  assert.ok(Math.abs(normalCdf(-1.96) - 0.025) < 1e-3);
});

test('estimateFilled scales by current quota', () => {
  const est = estimateFilled(20, [
    { year: 2026, quota: 10, filled: 10 },
    { year: 2025, quota: 10, filled: 10 },
    { year: 2024, quota: 10, filled: 10 },
  ]);
  assert.ok(est);
  assert.equal(Math.round(est.mean), 20);
  assert.ok(est.spread >= 4); // 20% floor
});

test('probability decreases as rank grows', () => {
  const ps = [1, 5, 10, 20, 40].map((r) => passProbability(r, 15, 4));
  for (let i = 1; i < ps.length; i++) assert.ok((ps[i] ?? 0) < (ps[i - 1] ?? 1));
  assert.ok(passProbability(1, 15, 4) > 0.99);
  assert.ok(passProbability(40, 15, 4) < 0.01);
});

test('computeOutlook reports per-year verdicts', () => {
  const o = computeOutlook(
    {
      quota: 10,
      history: [
        { year: 2024, quota: 10, filled: 3 },
        { year: 2026, quota: 10, filled: 8 },
        { year: 2025, quota: 10, filled: 5 },
      ],
    },
    6,
  );
  assert.ok(o);
  assert.deepEqual(o.byYear.map((y) => [y.year, y.passed]), [
    [2026, true],
    [2025, false],
    [2024, false],
  ]);
  assert.equal(o.curve[0]?.rank, 1);
});

test('computeOutlook returns null without history', () => {
  assert.equal(computeOutlook({ quota: 10, history: [] }, 3), null);
});

test('dates helpers', () => {
  assert.equal(daysUntil('2026-12-18', '2026-12-11'), 7);
  assert.equal(formatDday(0), 'D-DAY');
  assert.equal(formatDday(-2), 'D+2');
});

test('admissionEvents fills defaults and sorts', () => {
  const common: CommonSchedule = {
    year: 2027,
    source: 'test',
    items: [],
    defaults: { register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T21:00', waitlistRegEnd: '2026-12-30T22:00' },
  };
  const a: Admission = {
    id: 'x', univ: 'u', track: 't', category: '학생부종합', dept: 'd', quota: 5, sample: false,
    schedule: { first: '2026-11-13', exam: ['2026-11-21', '2026-11-22'], final: '2026-12-12' },
    history: [],
  };
  const ev = admissionEvents(a, common);
  assert.deepEqual(ev.map((e) => e.kind), ['first', 'exam', 'final', 'register', 'waitlist', 'waitlistReg']);
  assert.equal(ev.find((e) => e.kind === 'waitlist')?.start, '2026-12-24');
});
