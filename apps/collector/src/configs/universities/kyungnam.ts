import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'kyungnam',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi.kyungnam.ac.kr',
  note: '입학처(ipsi.kyungnam.ac.kr)와 대표 홈페이지(www.kyungnam.ac.kr) robots.txt 가 검색엔진 외 모든 자동 수집을 금지 (User-agent: * Disallow: /). 입학처 허락 필요',
};

export default config;
