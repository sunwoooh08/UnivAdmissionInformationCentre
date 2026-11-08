import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'gnu',
  status: 'robots-blocked',
  admissionSite: 'https://www.gnu.ac.kr/new/cm/cntnts/cntntsView.do?mi=48029&cntntsId=21841',
  note: 'robots.txt 가 /upload/·/common/ 을 금지 (2026 수시 입학결과·2027 모집요강 PDF가 모두 이 경로). 입학본부 허락 필요',
};

export default config;
