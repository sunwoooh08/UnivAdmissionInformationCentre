import type { UniversityConfig } from '../types.js';

/** 모집요강 표의 행: 모집단위 뒤 첫 칸이 일반전형 인원 (뒤 칸은 빈칸이 있어 위치를 알 수 없으므로 쓰지 않음) */
const firstColumn = [{ pattern: /^(?<quotaNow>\d+)(?: \d+)*$/ }];

const config: UniversityConfig = {
  id: 'kongju',
  status: 'active',
  admissionSite: 'https://ipsi.kongju.ac.kr',
  note:
    '모집요강의 일반전형(교과·종합) 모집인원·일정만 반영. 입시결과집(2024~2026, 추가합격인원 포함)은 ' +
    '행마다 전형명·학년도가 들어 있는 표라 현재 추출기로 읽을 수 없음',
  guide: {
    label: '국립공주대학교 2027학년도 수시 모집요강',
    url: 'https://ipsi.kongju.ac.kr/attach/image/44a038e6d069249324e35d9e6f1998b6/13055e35ba7465cb478c5b4be490c5a8',
    format: 'pdf',
    quotas: [
      {
        // "학생부종합   일반전형, 특성화고교졸업자전형, 장애인 등 대상자전형" 장의 1. 모집단위 및 모집인원
        section: /^\s*(?<track>학생부종합)\s{2,}일반전형, 특성화고교졸업자전형/g,
        renameTrack: () => '학생부종합(일반전형)',
        sectionEnd: /^\s*2\. 지원자격|정시|수능\s*위주/,
        rows: firstColumn,
      },
      {
        // "학생부교과   일반전형, 자율전공전형, 지역인재전형, …" 장의 1. 모집단위 및 모집인원
        // 자율전공학부 행은 일반전형 칸이 비어 있어 첫 숫자가 다른 전형 인원이므로 제외
        section: /^\s*(?<track>학생부교과)\s{2,}일반전형, 자율전공전형/g,
        renameTrack: () => '학생부교과(일반전형)',
        // 학생부 반영방법 장의 '학생부교과  일반전형, 자율전공전형 …' 줄은 바로 다음 '실기/실적 …' 줄에서 끊는다
        sectionEnd: /^\s*2\. 지원자격|^\s*실기\/실적\s{2,}|정시|수능\s*위주/,
        skipDept: /자율전공학부|^(계|합계|소계|총계)$|학년도/,
        rows: firstColumn,
      },
    ],
    // Ⅳ. 전형일정: 최초합격자 발표 2026.12.18.(금) 18:00
    //  - 교과 일반전형은 일괄합산(1단계 없음). 실기고사는 체육·음악·미술교육과만 있어 exam 은 적지 않음
    //  - 종합 일반전형은 사범대학·예술대학만 1단계(11.19)·면접(11.26)이 있어 first/exam 은 적지 않음
    schedules: [
      { track: '학생부교과(일반전형)', first: null, final: '2026-12-18T18:00', waitlistEnd: '2026-12-29T18:00' },
      { track: '학생부종합(일반전형)', final: '2026-12-18T18:00', waitlistEnd: '2026-12-29T18:00' },
    ],
  },
};

export default config;
