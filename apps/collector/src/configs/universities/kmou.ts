import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'kmou',
  status: 'robots-blocked',
  admissionSite: 'https://www.kmou.ac.kr/ipsi/main.do',
  note: '입시결과·모집요강 첨부파일이 /common/nttFileDownload.do 로만 제공되는데 www.kmou.ac.kr robots.txt 가 /common/ 수집을 금지 (User-agent: *). 허락 필요',
};

export default config;
