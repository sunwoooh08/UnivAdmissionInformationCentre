import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'kookmin',
  status: 'robots-blocked',
  admissionSite: 'https://admission.kookmin.ac.kr',
  note: 'admission.kookmin.ac.kr robots.txt 가 검색엔진(Googlebot·Yeti·bingbot 등) 외 모든 자동 수집을 금지 (User-agent: * Disallow: /). 입학처 허락 필요',
};

export default config;
