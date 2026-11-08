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
};

export default config;
