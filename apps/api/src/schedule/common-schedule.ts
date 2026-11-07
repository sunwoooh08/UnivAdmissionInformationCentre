import type { CommonSchedule } from '@susi/shared';

/** 한국대학교육협의회 2027학년도 대학입학전형 시행계획 기준 수시 공통 일정 */
export const COMMON_SCHEDULE: CommonSchedule = {
  year: 2027,
  source: '한국대학교육협의회 2027학년도 대학입학전형 시행계획',
  items: [
    { key: 'apply', label: '수시 원서접수', range: ['2026-09-07', '2026-09-11'], note: '대학별 3일 이상' },
    { key: 'period', label: '수시 전형기간', range: ['2026-09-12', '2026-12-17'] },
    { key: 'csat', label: '대학수학능력시험', range: ['2026-11-19', '2026-11-19'] },
    { key: 'csatScore', label: '수능 성적 통지', range: ['2026-12-11', '2026-12-11'] },
    { key: 'finalDeadline', label: '수시 합격자 발표 마감', range: ['2026-12-18', '2026-12-18'] },
    { key: 'register', label: '수시 합격자 등록', range: ['2026-12-21', '2026-12-23'] },
    {
      key: 'waitlist',
      label: '수시 미등록 충원합격 통보 마감',
      range: ['2026-12-24', '2026-12-29T21:00'],
      note: '홈페이지 발표 14시, 개별 통보 21시까지',
    },
    { key: 'waitlistReg', label: '수시 미등록 충원 등록 마감', range: ['2026-12-30T22:00', '2026-12-30T22:00'] },
  ],
  defaults: {
    register: ['2026-12-21', '2026-12-23'],
    waitlistEnd: '2026-12-29T21:00',
    waitlistRegEnd: '2026-12-30T22:00',
  },
};
