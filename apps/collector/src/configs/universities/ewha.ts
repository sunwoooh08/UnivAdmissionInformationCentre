import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'ewha',
  status: 'active',
  admissionSite: 'https://admission.ewha.ac.kr',
  results: [
    {
      label: '이화여자대학교 2024-2026학년도 전형결과',
      url: 'https://admission.ewha.ac.kr/upload/BBS0004/20260528160210YBS9YB.PDF',
      format: 'pdf',
      years: [2026],
      spec: {
        // Ⅰ. 학생부교과(고교추천전형)   (목차 줄은 뒤에 점선이 있어 제외)
        section: /^[ⅠⅡⅢⅣⅤⅥⅦ]\.\s*(?<track>\S[^·…]*?\))\s*$/g,
        // 모집인원 경쟁률(n : 1) 충원인원
        rows: [{ pattern: /^(?<quota2026>\d+) [\d.]+ : 1 (?<filled2026>\d+)(?: |$)/ }],
        skipTrack: /수능/,
      },
    },
  ],
  guide: {
    label: '이화여자대학교 2027학년도 수시모집요강',
    url: 'https://admission.ewha.ac.kr/upload/BBS0012/20260907134717D73T3V.PDF',
    format: 'pdf',
    quotas: [
      {
        // 2. 전형별·모집단위별 모집인원 — 고교추천 서류형 면접형 고른기회 사회기여자 논술 예체능실기 예체능서류 (정시 …)
        section: /(?<track>전형별·모집단위별 모집인원)/g,
        sectionEnd: /^\s*0[2-9]\s+\S/,
        ignoreCells: /^(인문|자연|예체능|인문\/자연)$/,
        rows: [
          {
            pattern:
              /^(?<m0>(?:\d+\*?|-)) (?<m1>(?:\d+\*?|-)) (?<m2>(?:\d+\*?|-)) (?<m3>(?:\d+\*?|-)) (?<m4>(?:\d+\*?|-)) (?<m5>(?:\d+\*?|-)) (?<m6>(?:\d+\*?|-)) (?<m7>(?:\d+\*?|-))/,
          },
        ],
        matrix: [
          '학생부교과(고교추천전형)',
          '학생부종합(미래인재전형-서류형)',
          '학생부종합(미래인재전형-면접형)',
          '학생부종합(고른기회전형)',
          '학생부종합(사회기여자전형)',
          '논술(논술전형)',
          '실기/실적(예체능실기전형)',
          '학생부종합(예체능서류전형)',
        ],
      },
    ],
    // 02 전형일정 — 2. 전형별 고사 및 합격자 발표 일정, 4. 등록 및 충원 일정
    schedules: [
      { track: '학생부교과(고교추천전형)', first: null, exam: null, final: '2026-12-17', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00' },
      { track: '학생부종합(미래인재전형-서류형)', first: null, exam: null, final: '2026-12-17', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00' },
      {
        track: '학생부종합(미래인재전형-면접형)',
        first: '2026-11-12',
        exam: ['2026-11-21', '2026-11-22'],
        final: '2026-12-03',
        register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00',
      },
      { track: '학생부종합(고른기회전형)', first: null, exam: null, final: '2026-12-03', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00' },
      { track: '학생부종합(사회기여자전형)', first: null, exam: null, final: '2026-12-03', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00' },
      { track: '논술(논술전형)', first: null, exam: ['2026-11-28', '2026-11-29'], final: '2026-12-17', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00' },
      { track: '실기/실적(예체능실기전형)', first: null, exam: ['2026-10-16', '2026-10-18'], final: '2026-12-03', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00' },
      {
        track: '학생부종합(예체능서류전형)',
        first: '2026-11-12',
        exam: ['2026-11-21', '2026-11-21'],
        final: '2026-12-17',
        register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00',
      },
    ],
  },
};

export default config;
