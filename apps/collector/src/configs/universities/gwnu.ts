import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'gwnu',
  status: 'unconfigured',
  admissionSite: 'https://www.kangwon.ac.kr/admission/main.do',
  note:
    '2026년 강원대학교와 통합(www.gwnu.ac.kr 은 "KNU site move" 안내만 표시). 2027 모집은 강원대학교(강릉·원주캠퍼스)로 진행되어 kangwon 설정에서 다뤄야 함. ' +
    'ipsi.gwnu.ac.kr·admission.gwnu.ac.kr 은 개발 환경에서 접속 불가(프록시 502)',
};

export default config;
