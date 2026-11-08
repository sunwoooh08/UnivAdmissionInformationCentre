import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'jejunu',
  status: 'robots-blocked',
  admissionSite: 'https://ibsi.jejunu.ac.kr',
  note: '입학안내(ibsi.jejunu.ac.kr)와 대표 홈페이지(www.jejunu.ac.kr) robots.txt 가 검색엔진 외 모든 자동 수집을 금지 (User-agent: * Disallow: /). 입학과 허락 필요',
};

export default config;
