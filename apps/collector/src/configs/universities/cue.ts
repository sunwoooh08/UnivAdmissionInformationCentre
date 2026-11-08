import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'cue',
  status: 'robots-blocked',
  admissionSite: 'https://www.cue.ac.kr',
  note:
    'www.cue.ac.kr robots.txt 가 첫 화면(/$) 외 전체 수집을 금지 (User-Agent: * / Disallow: /). ' +
    'ipsi.cue.ac.kr 는 개발 환경에서 접속 불가. 입학처 허락 필요',
};

export default config;
