import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admissionKey, describeChanges, inferCategory, mergeDraft, missingForPublish, RULES_2027, validateDraft, validateMerged } from './ingest.js';
import type { AdmissionDraft } from './types.js';

const src = [{ label: '2027 수시모집요강', url: 'https://example.ac.kr/a.pdf', checkedAt: '2026-11-08' }];
const base: AdmissionDraft = { univ: ' 가나대학교 ', track: '학생부종합  (일반)', dept: '경영학과', sources: src };

test('admissionKey ignores whitespace and case', () => {
  assert.equal(admissionKey(base), admissionKey({ univ: '가나대학교', track: '학생부종합(일반)', dept: '경영학과' }));
});

test('merge combines schedule and history from separate collectors', () => {
  const a = mergeDraft(null, { ...base, category: '학생부종합', quota: 20, schedule: { first: null, exam: null, final: '2026-12-12' } });
  assert.deepEqual(missingForPublish(a), []);
  const b = mergeDraft(a, {
    ...base,
    sources: [{ label: '2026 입시결과', url: 'https://example.ac.kr/r.pdf', checkedAt: '2026-11-08' }],
    history: [
      { year: 2026, quota: 20, filled: 31 },
      { year: 2025, quota: 20, filled: 26 },
    ],
  });
  assert.equal(b.schedule.final, '2026-12-12');
  assert.equal(b.history.length, 2);
  assert.equal(b.sources.length, 2);
  assert.equal(b.univ, '가나대학교');
  assert.ok(describeChanges(a, b).some((m) => m.includes('2026 입시결과 추가')));
});

test('history keeps the latest three years', () => {
  const m = mergeDraft(null, {
    ...base,
    history: [2022, 2023, 2024, 2025].map((year) => ({ year, quota: 10, filled: 5 })),
  });
  assert.deepEqual(m.history.map((h) => h.year), [2025, 2024, 2023]);
});

test('partial publish: history alone is enough once the category is known', () => {
  const noCategory = mergeDraft(null, { ...base, history: [{ year: 2026, quota: 10, filled: 3 }] });
  assert.deepEqual(missingForPublish(noCategory), ['전형 유형']);
  const withCategory = mergeDraft(noCategory, { ...base, category: '학생부종합' });
  assert.deepEqual(missingForPublish(withCategory), []);
  const empty = mergeDraft(null, { ...base, category: '학생부종합' });
  assert.ok(missingForPublish(empty).some((m) => m.includes('충원 이력')));
});

test('history quota may be unknown', () => {
  const errs = validateDraft({ ...base, history: [{ year: 2026, quota: null, filled: 40 }] }, null, RULES_2027);
  assert.deepEqual(errs, []);
});

test('a big jump in filled count for the same year is rejected', () => {
  const stored = mergeDraft(null, { ...base, history: [{ year: 2026, quota: 20, filled: 10 }] });
  const errs = validateDraft({ ...base, history: [{ year: 2026, quota: 20, filled: 95 }] }, stored, RULES_2027);
  assert.ok(errs.some((e) => e.includes('충원인원이 기존 값')));
});

test('category inference from track names', () => {
  assert.equal(inferCategory('학생부교과(추천형)'), '학생부교과');
  assert.equal(inferCategory('학생부종합(활동우수형)'), '학생부종합');
  assert.equal(inferCategory('논술우수자'), '논술');
  assert.equal(inferCategory('학교장추천인재'), '학생부교과');
  assert.equal(inferCategory('실기(연극학부)'), '실기/실적');
});

test('validation rejects implausible values', () => {
  const errs = validateDraft(
    {
      ...base,
      quota: 0,
      schedule: { final: '2027-03-02' },
      history: [
        { year: 2026, quota: 10, filled: 500 },
        { year: 2030, quota: 10, filled: 1 },
      ],
    },
    null,
    RULES_2027,
  );
  assert.ok(errs.some((e) => e.includes('모집인원')));
  assert.ok(errs.some((e) => e.includes('수시 기간')));
  assert.ok(errs.some((e) => e.includes('10배')));
  assert.ok(errs.some((e) => e.includes('학년도')));
});

test('validation rejects invalid calendar dates and missing sources', () => {
  const errs = validateDraft({ ...base, sources: [], schedule: { final: '2026-11-31' } }, null, RULES_2027);
  assert.ok(errs.some((e) => e.includes('출처가 없습니다')));
  assert.ok(errs.some((e) => e.includes('형식')));
});

test('validation rejects a big jump against stored values for the same year', () => {
  const stored = mergeDraft(null, { ...base, history: [{ year: 2026, quota: 20, filled: 10 }] });
  const errs = validateDraft({ ...base, history: [{ year: 2026, quota: 200, filled: 10 }] }, stored, RULES_2027);
  assert.ok(errs.some((e) => e.includes('크게 다릅니다')));
});

test('merged schedule order is checked', () => {
  const m = mergeDraft(null, { ...base, schedule: { first: '2026-12-01', exam: ['2026-11-20', '2026-11-21'], final: '2026-12-10' } });
  assert.ok(validateMerged(m).some((e) => e.includes('1단계 발표가 면접')));
});
