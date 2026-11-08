import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'kau',
  status: 'robots-blocked',
  admissionSite: 'https://ibhak.kau.ac.kr',
  note:
    'ibhak.kau.ac.kr robots.txt 가 "Disallow: /" (허용은 /admission/html, /admission/html2 만). ' +
    '2026 수시 입시결과·2027 모집요강 PDF 는 /common/downLoadProc.asp, /upload/GUIDES/ 경로라 수집 불가. 입학처 허락 필요',
};

export default config;
