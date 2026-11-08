import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'calvin',
  status: 'robots-blocked',
  admissionSite: 'https://www.calvin.ac.kr',
  note: 'www.calvin.ac.kr robots.txt 가 모든 자동 수집을 금지 (User-Agent: * / Disallow: /). 입학처 허락 필요',
};

export default config;
