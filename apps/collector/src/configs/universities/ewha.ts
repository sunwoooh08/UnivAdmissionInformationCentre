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
};

export default config;
