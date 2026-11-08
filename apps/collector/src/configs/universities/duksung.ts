import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'duksung',
  status: 'unconfigured',
  admissionSite: 'https://ipsi.duksung.ac.kr',
  note:
    '입학처(ipsi.duksung.ac.kr)가 개발 환경에서 접속 불가(연결 끊김, 2회 시도)라 2026 수시 입시결과(2024~2026 3개년 자료집)·2027 수시모집요강 위치와 형식 미확인. ' +
    'www.duksung.ac.kr robots.txt 는 /b /c /d /i /s /t /u 로 시작하는 경로를 Disallow',
};

export default config;
