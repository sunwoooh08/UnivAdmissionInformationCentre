import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'puts',
  status: 'robots-blocked',
  admissionSite: 'https://www.puts.ac.kr',
  note:
    'www.puts.ac.kr robots.txt 가 Googlebot 외 모든 자동 수집을 금지 (User-Agent: * / Disallow: /). ' +
    'ipsi.puts.ac.kr 는 개발 환경에서 접속 불가. 입학처 허락 필요',
};

export default config;
