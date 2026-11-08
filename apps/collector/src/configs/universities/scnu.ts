import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'scnu',
  status: 'robots-blocked',
  admissionSite: 'https://www.scnu.ac.kr/iphak/main.do',
  note:
    '2027 수시모집요강 PDF가 /upload/ 아래(https://www.scnu.ac.kr/upload/download/iphak/2027susi_0617.pdf)에 있는데 ' +
    'robots.txt 가 User-agent * 에 Disallow: /upload/. 입시결과(성적분포·충원합격자 현황)는 XLSX 로만 게시',
};

export default config;
