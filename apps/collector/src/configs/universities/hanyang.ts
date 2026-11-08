import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'hanyang',
  status: 'active',
  admissionSite: 'https://go.hanyang.ac.kr',
  note: '결과표에 연도별 모집인원이 없어 추가합격 인원만 반영',
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
        ignoreCells: /^(인문|자연|예체능|통합|인문\/자연|인문·자연)$/,
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
};

export default config;
