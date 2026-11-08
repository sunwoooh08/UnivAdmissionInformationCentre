import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'kumoh',
  status: 'unconfigured',
  admissionSite: 'https://iphak.kumoh.ac.kr',
  note:
    '개발 환경에서 접속 불가 (iphak.kumoh.ac.kr 이 "보안정책에 의해 차단"(CODE-WF) 응답, www 는 연결 끊김). ' +
    '검색상 입시결과는 수시모집 성적현황 게시판 https://iphak.kumoh.ac.kr/ipsi/sub010203.do 의 XLSX(2024~2026 3개년) — PDF 아님',
};

export default config;
