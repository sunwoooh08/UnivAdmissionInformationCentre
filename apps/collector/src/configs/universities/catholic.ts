import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'catholic',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi.catholic.ac.kr',
  note: '입학처(ipsi.catholic.ac.kr) robots.txt 가 모든 수집을 금지 (User-agent: * / Disallow: /). 입학처 허락 필요',
};

export default config;
