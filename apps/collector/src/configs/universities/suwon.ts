import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'suwon',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi.suwon.ac.kr',
  note: 'ipsi.suwon.ac.kr robots.txt 가 Disallow: / 후 /board·/guide 등 페이지만 허용. 입시결과·차순위표 첨부(/download/)와 모집요강(/upload_data/) PDF는 금지 경로. 입학처 허락 필요',
};

export default config;
