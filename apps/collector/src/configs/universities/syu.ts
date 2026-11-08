import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'syu',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi.syu.ac.kr',
  note:
    '입학처(ipsi.syu.ac.kr) robots.txt 가 /2016_syu 외 전체 수집을 금지 (User-agent: * / Disallow: / / Allow: /2016_syu). ' +
    '입시결과·모집요강 파일이 허용 경로에 있는지 확인 못함. 입학처 허락 필요',
};

export default config;
