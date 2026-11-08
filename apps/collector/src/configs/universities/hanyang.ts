import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'hanyang',
  status: 'active',
  admissionSite: 'https://go.hanyang.ac.kr',
  note: '입시결과표에 연도별 모집인원이 없어 지난 해는 추가합격 인원만 반영 (올해 모집인원은 모집요강)',
  results: [
    {
      label: '한양대학교 2024~2026학년도 주요 전형 입시결과',
      url: 'https://go.hanyang.ac.kr/file/download.do?menu=board&file_no=20773&type=B_1_8',
      format: 'pdf',
      years: [2026, 2025, 2024],
      spec: {
        // 펼친 두 쪽에 같은 제목이 나란히: "학생부교과 (추천형)      학생부교과 (추천형)"
        section: /(?<track>학생부(?:교과|종합)\s*\([^)]+\)|논술\s*전형)/g,
        sectionAlone: true,
        ignoreCells: /^(인문|자연|상경|예체능|통합|인문\/자연|자연\/인문|인문·자연)$/,
        rows: [
          // 경쟁률 2026 2025 / 추가합격 2026 2025 / 내신 …  (종합 추천형은 2개년)
          { tracks: /종합\(추천형\)/, pattern: /^[\d.]+ [\d.]+ (?<filled2026>\d+) (?<filled2025>\d+) \d+\.\d\d/ },
          // 경쟁률 2026 2025 2024 / 추가합격 2026 2025 2024
          { pattern: /^\d+\.\d [\d.]+ [\d.]+ (?<filled2026>\d+) (?<filled2025>\d+) (?<filled2024>\d+)(?: |$)/ },
        ],
        renameTrack: (t) => (t.startsWith('논술') ? '논술' : t),
      },
    },
  ],
  // 입시결과의 학과명을 2027 모집요강 이름으로 맞춤
  deptAliases: {
    건축학부: '건축학부(5년제)',
    전기공학전공: '전기·생체공학부(전기공학전공)',
    바이오메디컬공학전공: '전기·생체공학부(바이오메디컬공학전공)',
    스포츠매니지먼트전공: '스포츠산업과학부(스포츠매니지먼트전공)',
    스포츠사이언스전공: '스포츠산업과학부(스포츠사이언스전공)',
    '연극영화학과(영화전공)': '연극영화학과(영화)',
  },
  guide: {
    label: '한양대학교 2027학년도 수시모집요강',
    url: 'https://go.hanyang.ac.kr/file/download.do?menu=mojib&file_no=502&type=pdf',
    format: 'pdf',
    // 수시 모집인원 총괄표: 빈 칸에 '-' 가 없어 PDF 좌표로 읽고, '계' 열과 합이 맞는 행만 받는다
    positionedQuotas: [
      {
        page: /모집인원\s*-\s*총괄표/,
        headers: ['추천형#1', '추천형#2', '서류형', '면접형', '기회', '통합', '재직자', '논술', '실적'],
        matrix: [
          '학생부교과(추천형)',
          '학생부종합(추천형)',
          '학생부종합(서류형)',
          '학생부종합(면접형)',
          '학생부종합(고른기회)',
          '학생부종합(사회통합)',
          '학생부종합(특성화고졸재직자)',
          '논술',
          '실기/실적',
        ],
        totalHeader: '계',
        ignoreWords: /^(자연|인문|상경|예체능|통합)$/,
      },
    ],
    // 수시 전형일정 (최종합격자 발표 12.18.(금), 미등록 충원 12.29.(화) 18:00, 충원 등록 12.30.(수) 16:00)
    schedules: [
      { track: '학생부교과(추천형)', first: null, exam: null, final: '2026-12-18', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
      { track: '학생부종합(추천형)', first: null, exam: null, final: '2026-12-18', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
      { track: '학생부종합(서류형)', first: null, exam: null, final: '2026-12-18', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
      { track: '학생부종합(고른기회)', first: null, exam: null, final: '2026-12-18', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
      { track: '학생부종합(사회통합)', first: null, exam: null, final: '2026-12-18', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
      { track: '학생부종합(특성화고졸재직자)', first: null, exam: null, final: '2026-12-18', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
      {
        track: '학생부종합(면접형)',
        first: '2026-11-13',
        exam: ['2026-11-22', '2026-12-06'],
        final: '2026-12-18',
        register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00',
      },
      { track: '논술', first: null, exam: ['2026-11-28', '2026-11-29'], final: '2026-12-18', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
      // 실기/실적은 세부 전형마다 고사일이 달라 발표일만 (11.13.(금))
      { track: '실기/실적', final: '2026-11-13', register: ['2026-12-21', '2026-12-23'], waitlistEnd: '2026-12-29T18:00', waitlistRegEnd: '2026-12-30T16:00' },
    ],
  },
};

export default config;
