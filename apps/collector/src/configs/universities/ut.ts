import type { UniversityConfig } from '../types.js';

const FINAL = '2026-12-18T16:00';

const config: UniversityConfig = {
  id: 'ut',
  status: 'active',
  admissionSite: 'https://www.ut.ac.kr/ipsi.do',
  note:
    '모집요강(2026.9.3. 변경 공고본)만 반영: 학생부종합Ⅰ·Ⅱ, 교과 일반·지역인재·지역인재-저소득. ' +
    '입시결과는 HWP(수시 전년결과 게시판)라 미사용. 스포츠의학과(교과+실기)는 실기 일정이 달라 제외',
  guide: {
    label: '국립한국교통대학교 2027학년도 수시 신입생 모집요강',
    url: 'https://www.ut.ac.kr/uloads_clone/rcrit/rcrit_202609030101397090.pdf',
    format: 'pdf',
    // Ⅶ 세부 전형별 안내 "가. 모집단위 및 모집인원" — 빈 칸이 공란이라 PDF 좌표로 읽는다
    positionedQuotas: [
      {
        page: /가\. 모집단위 및 모집인원[\s\S]*학생부종합Ⅰ[\s\S]*학생부종합Ⅱ/,
        headers: ['학생부종합Ⅰ', '학생부종합Ⅱ'],
        matrix: ['학생부종합Ⅰ', '학생부종합Ⅱ'],
        ignoreWords: /^(합계)$/,
      },
      {
        page: /가\. 모집단위 및 모집인원[\s\S]*일반전형[\s\S]*지역인재전형-/,
        headers: ['일반전형', '지역인재전형', '지역인재전형-'],
        matrix: ['학생부교과(일반전형)', '학생부교과(지역인재전형)', '학생부교과(지역인재전형-저소득)'],
        ignoreWords: /^(합계|스포츠의학과)$/,
      },
    ],
    // Ⅲ 원서접수 및 전형일정 안내
    schedules: [
      { track: '학생부종합Ⅰ', first: '2026-11-16T16:00', exam: ['2026-11-25', '2026-11-27'], final: FINAL },
      { track: '학생부종합Ⅱ', first: null, exam: null, final: FINAL },
      { track: '학생부교과(일반전형)', first: null, exam: null, final: FINAL },
      { track: '학생부교과(지역인재전형)', first: null, exam: null, final: FINAL },
      { track: '학생부교과(지역인재전형-저소득)', first: null, exam: null, final: FINAL },
    ],
  },
  // 표에서 전공 칸(전공 목록)이 모집단위 이름으로 읽히는 학부
  deptAliases: {
    '사회기반공학전공, 환경공학전공, 도시·교통공학전공': '건설환경도시교통공학부',
    '바이오메디컬전공, 제약바이오전공': '나노메디컬공학부',
    '항공·기계설계전공, 드론공학전공': '항공모빌리티학부',
    '철도인공지능전공, 철도데이터사이언스전공': '철도AI·데이터공학부',
  },
};

export default config;
