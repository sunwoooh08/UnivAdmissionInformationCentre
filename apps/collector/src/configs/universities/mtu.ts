import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'mtu',
  status: 'unconfigured',
  admissionSite: 'https://www.mtu.ac.kr',
  note:
    '개발 환경에서 접속 불가: www.mtu.ac.kr 는 웹 보안 정책으로 차단("웹 보안 정책에 위배되어 차단되었습니다"), ' +
    'ipsi.mtu.ac.kr 는 로그인 화면(NRLogin.do)으로만 이동. 입시결과·2027 모집요강 파일 위치 미확인',
};

export default config;
