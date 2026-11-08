import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'dongguk',
  status: 'active',
  admissionSite: 'https://ipsi.dongguk.edu',
  results: [
    {
      label: '동국대학교 2026학년도 입학전형 결과',
      url: 'https://ipsi.dongguk.edu/upload/file/202609181646284P926C.PDF',
      format: 'pdf',
      years: [2026, 2025],
      spec: {
        // ■ [학생부종합] Do Dream   /   ■ 논술전형
        section: /■\s*(?:\[(?<category>[^\]]+)\]\s*)?(?<track>\S.*?)(?=\s{2,}|$)/g,
        sectionMarker: /^\s*■/,
        // 학생부 성적표·수능 성적표·모집단위별 충원율(정시 포함) 표는 건너뜀
        skipTrack: /성적|분포|충원율|수능/,
        // 2026: 모집 지원 경쟁률 (등급…) 충원율%   2025: 모집 지원 경쟁률 (등급…) 충원율%
        rows: [
          {
            pattern:
              /^(?<quota2026>\d+) [\d,]+ [\d.]+ (?:[\d.]+ )*?(?<rate2026>\d+(?:\.\d+)?)%(?: (?<quota2025>\d+) [\d,]+ [\d.]+ (?:[\d.]+ )*?(?<rate2025>\d+(?:\.\d+)?)%)?/,
          },
        ],
      },
    },
  ],
  // 모집요강의 전형명을 입시결과 이름으로 맞춤
  trackAliases: {
    '특성화고등을졸업한재직자-면접형': '특성화고등을졸업한재직자(면접형)',
    '특성화고등을졸업한재직자-서류형': '특성화고등을졸업한재직자(서류형)',
    논술: '논술전형',
  },
  guide: {
    label: '동국대학교 2027학년도 수시모집요강',
    url: 'https://ipsi.dongguk.edu/upload/file/20260715140521FRWQXB.PDF',
    format: 'pdf',
    quotas: [
      {
        // 전형별 세부사항의 장 제목 "종합   Do Dream   655명" → 그 장의 "1. 모집인원" 표 (한 줄에 모집단위 두 개)
        chapter: /^\s*(?:(?<category>종합|교과)|GU)\s+(?<track>\S.*?)\s{10,}[\d,]+명\s*$/,
        chapterMarker: /^\s*\S.*\S\s{10,}[\d,]+명\s*$/,
        section: /(?<track>단과대학)(?=\s+모집단위)/g,
        // 모집인원 표 다음 항목("2. 지원자격")에서 멈춤
        sectionEnd: /^\s*2\.\s|정시|수능\s*위주/,
        rows: [{ pattern: /^(?<quotaNow>\d+)$/ }],
      },
    ],
    schedules: [
      { track: 'Do Dream', first: '2026-11-13', exam: ['2026-12-11', '2026-12-13'], final: '2026-12-18' },
      { track: '불교추천인재', first: '2026-11-13', exam: ['2026-12-13', '2026-12-13'], final: '2026-12-18' },
      { track: '기회균형통합', first: '2026-11-13', exam: ['2026-12-11', '2026-12-13'], final: '2026-12-18' },
      { track: '특수교육대상자', first: '2026-11-13', exam: ['2026-12-11', '2026-12-13'], final: '2026-12-18' },
      {
        track: '특성화고등을졸업한재직자(면접형)',
        first: '2026-11-13',
        exam: ['2026-12-12', '2026-12-13'],
        final: '2026-12-18',
      },
      { track: '학교장추천인재', first: null, exam: null, final: '2026-12-01' },
      { track: '특성화고등을졸업한재직자(서류형)', first: null, exam: null, final: '2026-12-01' },
      { track: '논술전형', first: null, exam: ['2026-11-22', '2026-11-22'], final: '2026-12-18' },
    ],
  },
};

export default config;
