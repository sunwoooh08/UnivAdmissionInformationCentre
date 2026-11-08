import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'dankook',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi.dankook.ac.kr',
  note: '입학처(ipsi.dankook.ac.kr) robots.txt 가 검색엔진·SNS 봇 외 모든 자동 수집을 금지 (User-agent: * Disallow: /). 입학처 허락 필요',
};

export default config;
