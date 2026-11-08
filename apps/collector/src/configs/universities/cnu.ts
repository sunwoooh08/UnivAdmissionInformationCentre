import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'cnu',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi.cnu.ac.kr',
  note: '입학본부(ipsi.cnu.ac.kr)와 대표 홈페이지(www.cnu.ac.kr) robots.txt 가 모든 자동 수집을 금지 (User-agent: * Disallow: /). 허락 필요',
};

export default config;
