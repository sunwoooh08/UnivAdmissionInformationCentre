import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'changwon',
  status: 'robots-blocked',
  admissionSite: 'https://ipsi.changwon.ac.kr',
  note: 'robots.txt 가 /common/nttFileDownload.do·/upload/ 를 금지 (모집요강·입학결과 첨부파일이 모두 이 경로). 입학처 허락 필요',
};

export default config;
