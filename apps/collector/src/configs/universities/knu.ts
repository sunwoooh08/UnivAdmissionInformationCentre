import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'knu',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi1.knu.ac.kr',
  note: '입학처(ipsi1.knu.ac.kr) robots.txt 가 모든 자동 수집을 금지 (User-agent: * / Disallow: /). 입학처 허락 필요',
};

export default config;
