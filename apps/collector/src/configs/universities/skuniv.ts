import type { UniversityConfig } from '../types.js';

const FINAL = '2026-12-18T17:00';

const config: UniversityConfig = {
  id: 'skuniv',
  status: 'active',
  admissionSite: 'https://go.skuniv.ac.kr',
  note:
    '모집요강만 반영(논술·교과·사회기여자·기회균형①). 입시결과 PDF(전년도 입시결과 게시판, 최종 예비번호 있음)는 ' +
    '전형명이 세로로 나뉘어 첫 행이 앞 전형에 붙으므로 미사용. 실기우수자·군사학과는 모집단위별 고사일이 달라 제외',
  guide: {
    label: '서경대학교 2027학년도 수시모집요강',
    url: 'https://go.skuniv.ac.kr/?module=file&act=procFileDownload&file_srl=228910&sid=232224e4f8021af627d5546ed93f1ef2&module_srl=210030',
    format: 'pdf',
    // 모집단위 및 모집인원 (빈 칸은 공란 → PDF 좌표로 읽고 정원내 소계와 합이 맞는 행만 받음)
    positionedQuotas: [
      {
        page: /정원내[\s\S]*논술[\s\S]*소계/,
        headers: ['논술', '교과#1', '교과#2', '사회', '실기', '군사', '기회'],
        matrix: ['논술우수자', '교과우수자', '교과균형', '사회기여자', '', '', '기회균형①'],
        totalHeader: '소계',
      },
    ],
    // 전형일정 ③ 논술고사, ④ 합격자발표 (모든 전형 2026.12.18.(금) 17:00)
    schedules: [
      { track: '논술우수자', category: '논술', first: null, exam: ['2026-11-01', '2026-11-01'], final: FINAL },
      { track: '교과우수자', category: '학생부교과', first: null, exam: null, final: FINAL },
      { track: '교과균형', category: '학생부교과', first: null, exam: null, final: FINAL },
      { track: '사회기여자', category: '학생부교과', first: null, exam: null, final: FINAL },
      { track: '기회균형①', category: '학생부교과', first: null, exam: null, final: FINAL },
    ],
  },
};

export default config;
