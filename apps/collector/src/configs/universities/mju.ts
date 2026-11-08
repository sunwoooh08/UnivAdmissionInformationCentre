import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'mju',
  status: 'robots-blocked',
  admissionSite: 'https://iphak.mju.ac.kr',
  note:
    'iphak.mju.ac.kr robots.txt 가 User-agent: * 에 Disallow: / (Allow: /main, /pages 만). ' +
    '입시결과 첨부(/_common/new_download_file.php)·모집요강(/images/mojib/…pdf) 모두 금지 경로. 입학처 허락 필요',
};

export default config;
