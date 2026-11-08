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
};

export default config;
