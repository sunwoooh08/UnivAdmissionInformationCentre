import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'yonsei',
  status: 'active',
  admissionSite: 'https://admission.yonsei.ac.kr/seoul',
  note: '입학처는 추천형·활동우수형·국제형·기회균형 등 주요 전형만 공개',
  results: [
    {
      label: '연세대학교 2026학년도 수시모집 선발결과',
      url: 'https://admission.yonsei.ac.kr/seoul/download.asp?furl=bbs/202604201055398D4W8V.PDF&fname=2026%C7%D0%B3%E2%B5%B5+%BC%F6%BD%C3%B8%F0%C1%FD+%BC%B1%B9%DF%B0%E1%B0%FA%2Epdf',
      format: 'pdf',
      years: [2026],
      spec: {
        // "1   학생부교과[추천형]        2    학생부종합[활동우수형]" (좌우 두 표)
        section: /(?<track>학생부(?:교과|종합)\[[^\]]+\])/g,
        // 모집인원 경쟁률(n : 1) 충원합격순위
        rows: [{ pattern: /^(?<quota2026>\d+) [\d.]+ : 1 (?<filled2026>\d+)(?: |$)/ }],
      },
    },
  ],
  guide: {
    label: '연세대학교 2027학년도 수시모집요강',
    url: 'https://admission.yonsei.ac.kr/seoul/upload/guide/20260529204109T8NZNJ.PDF',
    format: 'pdf',
    quotas: [
      {
        // Ⅱ. 전형별 모집단위·모집인원 — 행=모집단위, 열=전형
        section: /(?<track>전형별 모집단위·모집인원)/g,
        sectionEnd: /^\s*Ⅲ\b|^\s*Ⅲ\s/,
        ignoreCells: /^(인문|자연|통합|국제|체능|인문·자연)$/,
        // 모집인원*(수시+정시) 추천형 활동우수형 국제형(국내고) 국제형(해외고) 국제인재 기회균형 논술 체육인재
        // 언더우드국제대학 행은 모집인원 칸이 합쳐져 따로 찍혀서, 첫 칸이 '-' 이면 모집인원 칸이 없는 행이다.
        rows: [
          {
            pattern:
              /^(?<m0>-) (?<m1>\d+|-) (?<m2>\d+|-) (?<m3>\d+|-) (?<m4>\d+|-) (?<m5>\d+|-) (?<m6>\d+|-) (?<m7>\d+|-)/,
          },
          {
            pattern:
              /^\d+ (?<m0>\d+|-) (?<m1>\d+|-) (?<m2>\d+|-) (?<m3>\d+|-) (?<m4>\d+|-) (?<m5>\d+|-) (?<m6>\d+|-)(?: (?<m7>\d+|-))?/,
          },
        ],
        matrix: [
          '학생부교과(추천형)',
          '학생부종합(활동우수형)',
          '학생부종합(국제형)',
          '', // 국제형(해외고/검정고시) — 입시결과가 국내고 기준이라 따로 두지 않음
          '학생부종합(국제인재)',
          '학생부종합(기회균형)',
          '논술',
          '특기자(체육인재)',
        ],
      },
    ],
    // Ⅳ. 전형 일정 및 합격자 발표/등록 (최초 합격자 발표 2026.12.18.(금) 18:00, 충원 6차 12.29.(화) 14:00 이전)
    schedules: [
      { track: '학생부교과(추천형)', first: null, exam: null, final: '2026-12-18T18:00', waitlistEnd: '2026-12-29T14:00' },
      {
        track: '학생부종합(활동우수형)',
        first: '2026-11-16',
        exam: ['2026-11-21', '2026-11-22'],
        final: '2026-12-18T18:00',
        waitlistEnd: '2026-12-29T14:00',
      },
      {
        track: '학생부종합(국제형)',
        first: '2026-11-23',
        exam: ['2026-11-29', '2026-11-29'],
        final: '2026-12-18T18:00',
        waitlistEnd: '2026-12-29T14:00',
      },
      {
        track: '학생부종합(국제인재)',
        first: '2026-10-26',
        exam: ['2026-11-01', '2026-11-01'],
        final: '2026-12-18T18:00',
        waitlistEnd: '2026-12-29T14:00',
      },
      {
        track: '학생부종합(기회균형)',
        first: '2026-10-26',
        exam: ['2026-11-01', '2026-11-01'],
        final: '2026-12-18T18:00',
        waitlistEnd: '2026-12-29T14:00',
      },
      { track: '논술', first: null, exam: ['2026-10-10', '2026-10-10'], final: '2026-12-18T18:00', waitlistEnd: '2026-12-29T14:00' },
      {
        track: '특기자(체육인재)',
        first: '2026-10-26',
        exam: ['2026-10-31', '2026-10-31'],
        final: '2026-12-18T18:00',
        waitlistEnd: '2026-12-29T14:00',
      },
    ],
  },
};

export default config;
