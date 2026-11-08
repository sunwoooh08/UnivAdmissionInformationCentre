import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'yongin',
  status: 'unconfigured',
  admissionSite: 'https://ipsi.yongin.ac.kr',
  note:
    '2026 신입학 전형결과 PDF(https://ipsi.yongin.ac.kr/ipsi/prev/result/susi/prev_susi_result_20260529_15361.pdf)의 ' +
    '충원 예비순위는 모집단위×전형 행렬에 빈칸이 많아 칸 위치 없이는 읽을 수 없음(추출기 기능 필요). ' +
    '2027 수시모집요강(https://ipsi.yongin.ac.kr/ipsi/guide/susi/mo_susi_20260623_1020.pdf)은 글자 층이 없는 이미지 PDF',
};

export default config;
