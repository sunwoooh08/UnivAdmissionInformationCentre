import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'inu',
  status: 'robots-blocked',
  admissionSite: 'https://admission.inu.ac.kr',
  note:
    'admission.inu.ac.kr robots.txt 가 User-agent: * 에 Disallow: / (검색엔진도 첫 화면만 허용). ' +
    '입시결과(지난입시결과 게시판)·모집요강 PDF 모두 이 호스트에 있음. 입학처 허락 필요',
};

export default config;
