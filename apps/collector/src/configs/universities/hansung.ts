import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'hansung',
  status: 'active',
  admissionSite: 'https://enter.hansung.ac.kr',
  note:
    '모집요강만 반영. 입시결과(수시 충원합격 현황 PDF)는 전형명이 표 안의 칸으로만 있어 지금 추출기로 못 읽음. ' +
    '기회균형·실기우수자 열은 제외 (같은 쪽 정원외 표와 위치가 겹침)',
  // 여러 학부를 묶어 뽑는 모집단위: 표에는 가운데 학부 이름 옆에 숫자가 찍힘
  deptAliases: { 전기전자공학부: 'IT공과대학', 자율전공: '상상력인재학부(자율전공)' },
  guide: {
    label: '한성대학교 2027학년도 수시 신입학 모집요강',
    url: 'https://enter.hansung.ac.kr/api/file/get?path=board//298f5dc2-450f-4c25-a14d-5b9290033ca4.pdf',
    format: 'pdf',
    // Ⅱ. 2027학년도 수시 모집단위별 모집인원(정원내) — 빈 칸에 '-' 가 없는 행렬 표
    positionedQuotas: [
      {
        page: /모집단위별 모집인원 \(정원내\)/,
        // 머리글 둘째 줄: 교과[우수] 지역[균형] 한성[인재] 기회균형[고른기회 성인학습자] 실기[우수자] 소계
        headers: ['우수', '균형', '인재', '고른기회', '성인학습자', '우수자'],
        // 같은 쪽 아래 정원외 표의 숫자가 기회균형 열 위치에 걸려 기회균형 두 열은 읽지 않는다
        matrix: ['교과우수', '지역균형', '한성인재', '', '', ''],
        totalHeader: '소계',
        ignoreWords: /^(합|계|합계|총|소계)$/,
      },
    ],
    // Ⅲ-2. 합격자 발표: 교과우수 2026.12.16.(수) 14:00, 그 밖의 학생부 전형 2026.11.6.(금) 14:00 (모두 일괄 선발)
    schedules: [
      { track: '교과우수', first: null, exam: null, final: '2026-12-16T14:00' },
      { track: '지역균형', first: null, exam: null, final: '2026-11-06T14:00' },
      { track: '한성인재', first: null, exam: null, final: '2026-11-06T14:00' },
    ],
  },
};

export default config;
