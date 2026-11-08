import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_BY_ID } from '../configs/index.js';
import { extractResults, type ResultsSpec } from './results.js';

// 대학 원본 파일 대신, 각 대학 표 모양을 흉내 낸 짧은 가짜 표로 검사한다. (숫자는 임의)

function specOf(id: string, i = 0): ResultsSpec {
  const spec = CONFIG_BY_ID.get(id)?.results?.[i]?.spec;
  assert.ok(spec, `${id} 설정 없음`);
  return spec;
}

test('single table with college column and hidden values (건국대 형식)', () => {
  const text = `
▷ 학생부교과(KU지역균형)
  단과대학            모집단위          모집인원       경쟁률    합격순위
               국어국문학과             3        5.67      7      -
  문과대학          사학과               3        7.00      6      -
               중어중문학과             3        6.00      -      -
            문과대학자유전공학부          35        9.97     111   697.67
                     합계              41        8.00     124
▷ 논술(KU논술우수자)
                경영학과              8        80.1      12
`;
  const { rows } = extractResults(text, specOf('konkuk'));
  assert.deepEqual(
    rows.map((r) => [r.track, r.category, r.dept, r.history[0]?.quota, r.history[0]?.filled]),
    [
      ['학생부교과(KU지역균형)', '학생부교과', '국어국문학과', 3, 7],
      ['학생부교과(KU지역균형)', '학생부교과', '사학과', 3, 6],
      ['학생부교과(KU지역균형)', '학생부교과', '문과대학자유전공학부', 35, 111],
      ['논술(KU논술우수자)', '논술', '경영학과', 8, 12],
    ],
  );
});

test('two tables side by side (연세대 형식)', () => {
  const text = `
1   학생부교과[추천형]                                          2    학생부종합[활동우수형]
     단과대학   모집단위      모집인원    경쟁률   순위                 단과대학   모집단위   모집인원   경쟁률   순위
               국어국문학과        7     4.71 : 1      9     1.27                  국어국문학과     10    12.30 : 1     10     2.01
      문과대학   사학과            7    6.00 : 1      5     1.38                  사학과        9    10.89 : 1     10     1.84
               도시공학과          5    8.60 : 1            1.33                  도시공학과      6     9.00 : 1      4     2.00
`;
  const { rows } = extractResults(text, specOf('yonsei'));
  const got = rows.map((r) => `${r.track}|${r.dept}|${r.history[0]?.quota}|${r.history[0]?.filled}`).sort();
  assert.deepEqual(got, [
    '학생부교과(추천형)|국어국문학과|7|9',
    '학생부교과(추천형)|사학과|7|5',
    '학생부종합(활동우수형)|국어국문학과|10|10',
    '학생부종합(활동우수형)|도시공학과|6|4',
    '학생부종합(활동우수형)|사학과|9|10',
  ]);
});

test('numbers spilling over the panel boundary do not drop the row', () => {
  const spec: ResultsSpec = {
    section: /(?<track>학생부(?:교과|종합)\[[^\]]+\])/g,
    rows: [{ pattern: /^(?<quota2026>\d+) (?<filled2026>\d+)/ }],
  };
  const text = [
    '학생부교과[추천형]                학생부종합[활동우수형]',
    '   국어국문학과   7   9   1.27    1.35  국어국문학과   10   10',
  ].join('\n');
  const { rows } = extractResults(text, spec);
  assert.deepEqual(
    rows.map((r) => `${r.track}|${r.dept}|${r.history[0]?.filled}`),
    ['학생부교과(추천형)|국어국문학과|9', '학생부종합(활동우수형)|국어국문학과|10'],
  );
});

test('rates are converted to counts and unknown sections end the table (동국대 형식)', () => {
  const text = `
■ [학생부종합] Do Dream                                     최종등록자 기준
                            모집   지원      경쟁률     평균     최저  충원율   모집   지원  경쟁률  평균  최저  충원율
       국어국문·문예창작학부           8    187    23.38   2.73   4.00   75%     7     181    25.86   2.58    2.88   129%
  경영  경영대학                 52   1,125   21.63   2.42   3.00   64%
       신설학과                  5     40    8.00   2.10   2.50   20%
■ 논술전형                                                  최종등록자 기준
          영어영문학부           9    683   75.89   22.33        2.88   4.70   33%     10   662   66.20   25.70        3.31   4.80    0%
■ 전형별 수능 성적(일반)
          영어영문학부           9    683   75.89   22.33        2.88   4.70   33%
`;
  const { rows } = extractResults(text, specOf('dongguk'));
  assert.deepEqual(
    rows.map((r) => [r.track, r.dept, r.history]),
    [
      [
        'Do Dream',
        '국어국문·문예창작학부',
        [
          { year: 2026, quota: 8, filled: 6 },
          { year: 2025, quota: 7, filled: 9 },
        ],
      ],
      ['Do Dream', '경영대학', [{ year: 2026, quota: 52, filled: 33 }]],
      ['Do Dream', '신설학과', [{ year: 2026, quota: 5, filled: 1 }]],
      [
        '논술전형',
        '영어영문학부',
        [
          { year: 2026, quota: 9, filled: 3 },
          { year: 2025, quota: 10, filled: 0 },
        ],
      ],
    ],
  );
  assert.equal(rows.find((r) => r.track === '논술전형')?.category, '논술');
});

test('a 정시 table after the last 수시 section is not attributed to it (한양대 형식)', () => {
  const text = [
    '',
    `논술 전형${' '.repeat(100)}논술 전형`,
    '                 경제금융학부      자연      80.1      90.2      70.3         2       1       3',
    `정시 (일반)${' '.repeat(98)}정시 (일반)`,
    '                 경제금융학부      자연      5.1      6.2      4.3         20       11       13',
  ].join('\n');
  const { rows } = extractResults(text, specOf('hanyang'));
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0]?.history, [
    { year: 2026, quota: null, filled: 2 },
    { year: 2025, quota: null, filled: 1 },
    { year: 2024, quota: null, filled: 3 },
  ]);
});

test('footnotes that mention a track do not start a section when sectionAlone is set', () => {
  const text = [
    '',
    `학생부교과 (추천형)${' '.repeat(100)}학생부교과 (추천형)`,
    '                 건축학부          자연       6.6      10.8       7.0         14      8       11',
    '   ※ 2025~2026학년도 학생부교과(추천형) 전형방법 : 학생부교과 90 + 교과 정성평가 10',
    '                 사학과            인문       20.0     10.0       6.3          4      12      4',
  ].join('\n');
  const { rows } = extractResults(text, specOf('hanyang'));
  assert.deepEqual(
    rows.map((r) => [r.dept, r.history.map((h) => h.filled)]),
    [
      ['건축학부', [14, 8, 11]],
      ['사학과', [4, 12, 4]],
    ],
  );
});

test('table of contents lines are not sections (이화여대 형식)', () => {
  const text = `
Ⅰ. 학생부교과(고교추천전형) ·································· 2
Ⅰ. 학생부교과(고교추천전형)
 대학          모집단위           모집      경쟁률         충원인원
            국어국문학과          10   9.70 : 1       32        1.53
Ⅳ. 수능(수능전형)
            국어국문학과          12   4.10 : 1       5
`;
  const { rows } = extractResults(text, specOf('ewha'));
  assert.deepEqual(
    rows.map((r) => [r.track, r.dept, r.history[0]?.filled]),
    [['학생부교과(고교추천전형)', '국어국문학과', 32]],
  );
});

test('every active config has a source and valid specs', () => {
  for (const [id, c] of CONFIG_BY_ID) {
    if (c.status !== 'active') continue;
    assert.ok(c.results?.length || c.guide, `${id}: 입시결과도 모집요강도 없음`);
    for (const r of c.results ?? []) {
      assert.ok(r.years.length > 0, `${id}: years`);
      assert.ok(r.spec.section.flags.includes('g'), `${id}: section g flag`);
      assert.ok(/^https:\/\//.test(r.url), `${id}: https`);
    }
  }
});

test('unit names lose college prefixes, exam times and change markers', async () => {
  const { cleanDept } = await import('./results.js');
  assert.equal(cleanDept('경찰사법 경찰행정학부'), '경찰행정학부');
  assert.equal(cleanDept('법과 법학과'), '법학과');
  assert.equal(cleanDept('(09:30~11:00) 경영학부'), '경영학부');
  assert.equal(cleanDept('경영대학 광역화'), '경영대학');
  assert.equal(cleanDept('국어국문학과†'), '국어국문학과');
  assert.equal(cleanDept('열린전공학부(인문)'), '열린전공학부(인문)');
  assert.equal(cleanDept('전기·생체공학부(전기공학전공)'), '전기·생체공학부(전기공학전공)');
});
