import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'swu',
  status: 'robots-blocked',
  admissionSite: 'https://admission.swu.ac.kr',
  note: '입학처(admission.swu.ac.kr) robots.txt 가 모든 자동 수집을 금지 (User-agent: * / Disallow: /). 입학처 허락 필요',
};

export default config;
