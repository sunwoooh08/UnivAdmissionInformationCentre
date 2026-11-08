import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'gachon',
  status: 'unconfigured',
  admissionSite: 'https://admission.gachon.ac.kr',
  note:
    '개발 환경에서 접속 불가: www.gachon.ac.kr·http 입학처는 웹방화벽이 차단(Detect client IP), ' +
    'https://admission.gachon.ac.kr 는 인증서 체인 누락(Sectigo DV R36 중간 인증서 미전송)으로 TLS 검증 실패. ' +
    '입시결과·2027 모집요강 파일 위치 미확인',
};

export default config;
