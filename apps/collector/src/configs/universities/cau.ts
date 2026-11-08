import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'cau',
  status: 'robots-blocked',
  admissionSite: 'https://admission.cau.ac.kr',
  note: 'robots.txt 가 Googlebot 외 모든 자동 수집을 금지 (Disallow: /). 입학처 허락 필요',
};

export default config;
