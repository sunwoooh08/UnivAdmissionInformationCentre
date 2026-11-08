import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'jbnu',
  status: 'robots-blocked',
  admissionSite: 'https://enter.jbnu.ac.kr',
  note: '입학본부(enter.jbnu.ac.kr) robots.txt 가 모든 자동 수집을 금지 (User-agent: * Disallow: /). 입학본부 허락 필요',
};

export default config;
