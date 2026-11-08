import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'kangnam',
  status: 'robots-blocked',
  admissionSite: 'https://admission.kangnam.ac.kr',
  note:
    'admission.kangnam.ac.kr robots.txt 가 User-agent: * 에 Disallow: /. ' +
    '대입전형결과(입학자료실)·모집요강 모두 이 호스트에 있음. 입학처 허락 필요',
};

export default config;
