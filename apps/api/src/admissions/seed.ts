import type { Admission } from '@susi/shared';

/**
 * 화면 구성을 보여주기 위한 예시 데이터.
 * 대학명은 가상이며 일정·충원 수치도 실제가 아니다. (sample: true)
 * 실제 지원 내역은 화면의 "직접 추가"로 입력한다.
 */
export const SAMPLE_ADMISSIONS: Admission[] = [
  {
    id: 'sample-hanbit-biz-jong',
    univ: '한빛대학교', track: '학생부종합 (활동우수형)', category: '학생부종합', dept: '경영학과',
    quota: 20,
    schedule: { first: '2026-11-13', exam: ['2026-11-21', '2026-11-22'], final: '2026-12-12' },
    history: [
      { year: 2026, quota: 22, filled: 31 },
      { year: 2025, quota: 20, filled: 26 },
      { year: 2024, quota: 20, filled: 18 },
    ],
    sample: true,
  },
  {
    id: 'sample-hanbit-biz-gyo',
    univ: '한빛대학교', track: '학생부교과 (지역균형)', category: '학생부교과', dept: '경영학과',
    quota: 12,
    schedule: { first: null, exam: null, final: '2026-12-12' },
    history: [
      { year: 2026, quota: 12, filled: 27 },
      { year: 2025, quota: 12, filled: 19 },
      { year: 2024, quota: 10, filled: 22 },
    ],
    sample: true,
  },
  {
    id: 'sample-nuri-cs',
    univ: '누리대학교', track: '학생부교과 (학교장추천)', category: '학생부교과', dept: '컴퓨터공학과',
    quota: 15,
    schedule: { first: null, exam: null, final: '2026-12-11' },
    history: [
      { year: 2026, quota: 15, filled: 41 },
      { year: 2025, quota: 15, filled: 37 },
      { year: 2024, quota: 14, filled: 29 },
    ],
    sample: true,
  },
  {
    id: 'sample-garam-econ',
    univ: '가람대학교', track: '논술우수자', category: '논술', dept: '경제학과',
    quota: 10,
    schedule: { first: null, exam: ['2026-11-28', '2026-11-28'], final: '2026-12-11' },
    history: [
      { year: 2026, quota: 10, filled: 2 },
      { year: 2025, quota: 10, filled: 1 },
      { year: 2024, quota: 11, filled: 3 },
    ],
    sample: true,
  },
  {
    id: 'sample-daon-bio',
    univ: '다온대학교', track: '학생부종합 (탐구형)', category: '학생부종합', dept: '생명과학과',
    quota: 12,
    schedule: { first: '2026-11-20', exam: ['2026-12-05', '2026-12-05'], final: '2026-12-16' },
    history: [
      { year: 2026, quota: 12, filled: 9 },
      { year: 2025, quota: 12, filled: 14 },
      { year: 2024, quota: 10, filled: 6 },
    ],
    sample: true,
  },
  {
    id: 'sample-mir-korean',
    univ: '미르대학교', track: '학생부종합', category: '학생부종합', dept: '국어국문학과',
    quota: 8,
    schedule: { first: '2026-11-27', exam: ['2026-12-06', '2026-12-06'], final: '2026-12-15' },
    history: [
      { year: 2026, quota: 8, filled: 5 },
      { year: 2025, quota: 8, filled: 3 },
      { year: 2024, quota: 9, filled: 7 },
    ],
    sample: true,
  },
  {
    id: 'sample-sodam-nursing',
    univ: '소담대학교', track: '학생부교과 (일반)', category: '학생부교과', dept: '간호학과',
    quota: 25,
    schedule: { first: null, exam: null, final: '2026-12-10' },
    history: [
      { year: 2026, quota: 25, filled: 33 },
      { year: 2025, quota: 25, filled: 45 },
      { year: 2024, quota: 24, filled: 30 },
    ],
    sample: true,
  },
  {
    id: 'sample-sodam-media',
    univ: '소담대학교', track: '학생부종합 (서류형)', category: '학생부종합', dept: '미디어커뮤니케이션학과',
    quota: 14,
    schedule: { first: null, exam: null, final: '2026-12-10' },
    history: [
      { year: 2026, quota: 14, filled: 11 },
      { year: 2025, quota: 14, filled: 16 },
      { year: 2024, quota: 15, filled: 12 },
    ],
    sample: true,
  },
];
