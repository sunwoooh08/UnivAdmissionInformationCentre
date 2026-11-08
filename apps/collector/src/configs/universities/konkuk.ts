import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'konkuk',
  status: 'active',
  admissionSite: 'https://www.konkuk.ac.kr/admission',
  results: [
    {
      label: '건국대학교 2026학년도 입시결과(통합)',
      url: 'https://www.konkuk.ac.kr/bbs/admission/6290/1216634/download.do',
      format: 'pdf',
      years: [2026],
      spec: {
        // ▷ 학생부교과(KU지역균형)
        section: /▷\s*(?<track>\S.*?)\s*$/g,
        sectionMarker: /^\s*(▷|\[(수시|정시)\])/,
        // 모집인원 경쟁률 충원합격순위 …  (모집인원 3명 이하는 순위가 '-' 로 비공개)
        rows: [{ pattern: /^(?<quota2026>\d+) [\d.]+ (?<filled2026>\d+|-)(?: |$)/ }],
        skipTrack: /수능|정시/,
      },
    },
  ],
  guide: {
    label: '건국대학교 2027학년도 수시모집요강',
    url: 'https://www.konkuk.ac.kr/bbs/admission/6282/1221044/download.do',
    format: 'pdf',
    // Ⅲ. 전형별 모집인원(정원 내외): 펼친 두 쪽, 세로쓰기 머리글의 첫 글자로 열을 찾고 '수시 모집인원' 합계와 맞는 행만 받는다
    positionedQuotas: [
      {
        page: /(?=[\s\S]*\bKU\b)(?=[\s\S]*인원)/,
        pageHalves: true,
        headers: ['KU#1', 'KU#2', '기', '특#1', '특#2', 'KU#3', '연#1', '연#2', '체', '특#3'],
        matrix: [
          '학생부교과(KU지역균형)',
          '학생부종합(KU자기추천)',
          '학생부종합(기회균형)',
          '학생부종합(특성화고교졸업자)',
          '학생부종합(특수교육대상자)',
          '논술(KU논술우수자)',
          '실기/실적(연기우수자)',
          '실기/실적(연출우수자)',
          '실기/실적(체육특기자)',
          '학생부종합(특성화고졸재직자)',
        ],
        totalHeader: '인원',
        ignoreWords: /^(인문|자연|예체능|통합|의학)$/,
      },
    ],
    // Ⅳ. 원서접수 및 전형일정, 합격자 발표 및 등록 안내
    schedules: [
      { track: '학생부교과(KU지역균형)', first: null, exam: null, final: '2026-12-18T14:00', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00' },
      {
        track: '학생부종합(KU자기추천)',
        first: '2026-11-20T14:00',
        exam: ['2026-12-05', '2026-12-06'],
        final: '2026-12-18T14:00',
        register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00',
      },
      {
        track: '학생부종합(특수교육대상자)',
        first: '2026-11-20T14:00',
        exam: ['2026-12-05', '2026-12-05'],
        final: '2026-12-18T14:00',
        register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00',
      },
      { track: '학생부종합(기회균형)', first: null, exam: null, final: '2026-12-18T14:00', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00' },
      { track: '학생부종합(특성화고교졸업자)', first: null, exam: null, final: '2026-12-18T14:00', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00' },
      { track: '학생부종합(특성화고졸재직자)', first: null, exam: ['2026-12-05', '2026-12-05'], final: '2026-12-18T14:00', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00' },
      { track: '논술(KU논술우수자)', first: null, exam: ['2026-11-21', '2026-11-21'], final: '2026-12-18T14:00', register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00' },
      {
        track: '실기/실적(연기우수자)',
        first: '2026-10-22T14:00',
        exam: ['2026-11-03', '2026-11-05'],
        final: '2026-12-18T14:00',
        register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00',
      },
      {
        track: '실기/실적(연출우수자)',
        first: '2026-10-22T14:00',
        exam: ['2026-11-06', '2026-11-06'],
        final: '2026-12-18T14:00',
        register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00',
      },
      {
        track: '실기/실적(체육특기자)',
        first: '2026-10-22T14:00',
        exam: ['2026-10-31', '2026-10-31'],
        final: '2026-11-20T14:00',
        register: ['2026-12-21', '2026-12-23T14:00'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T14:00',
      },
    ],
  },
};

export default config;
