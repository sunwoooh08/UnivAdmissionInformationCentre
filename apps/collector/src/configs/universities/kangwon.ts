import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'kangwon',
  status: 'unconfigured',
  admissionSite: 'https://www.kangwon.ac.kr/admission/main.do',
  note:
    '입학 게시판·자료(www.kangwon.ac.kr/admission/…)가 개발 환경에서 접속 불가(빈 응답, robots.txt 포함 3회 시도). ' +
    'admission.kangwon.ac.kr 는 robots.txt 가 /admission/ 외 전체 Disallow. 2026 강릉원주대 통합 후 입시결과·2027 모집요강 위치 미확인',
};

export default config;
