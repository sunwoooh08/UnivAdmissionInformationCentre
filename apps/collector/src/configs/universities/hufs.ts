import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'hufs',
  status: 'robots-blocked',
  admissionSite: 'https://adms.hufs.ac.kr',
  note: 'robots.txt 가 모든 자동 수집을 금지 (Disallow: /). 입학처 허락 필요',
};

export default config;
