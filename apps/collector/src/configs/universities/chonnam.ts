import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'chonnam',
  status: 'unconfigured',
  admissionSite: 'https://admission.jnu.ac.kr',
  note:
    '개발 환경에서 접속 불가 (admission.jnu.ac.kr 연결 끊김). 확인할 자료: 2027 수시모집요강 PDF ' +
    'https://admission.jnu.ac.kr/Data/tmfiles/admission/doc/2027/2027-susi-0827.pdf , ' +
    '입학결과 게시판(2026학년도 대입전형 입시 결과분석 자료) https://admission.jnu.ac.kr/WebApp/web/HOM/COM/Board/board.aspx?boardID=423',
};

export default config;
