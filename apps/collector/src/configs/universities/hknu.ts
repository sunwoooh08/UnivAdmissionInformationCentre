import type { ResultsSpec } from '../../extract/results.js';
import type { UniversityConfig } from '../types.js';

/**
 * 2026 수시 결과표: 모집단위 모집인원 지원인원 경쟁률 등록인원 등록률% (최초합격자 최고·평균·최저·표준편차)
 * (최종등록자 최고·평균·최저·표준편차) 충원 순위 배수 [수능최저 인원 비율]
 * 표준편차 칸이 비는 행이 있어 등급 칸은 6~8개로 받고, 충원 순위가 빈 행은 읽지 않는다.
 */
const resultSpec = (skipDept: RegExp): ResultsSpec => ({
  // "2026 수시 일반전형(학생부 종합) 결과", "2026 수시 지역균형 결과 - 안성캠퍼스", "2026 수시 사회통합 결과"
  section: /^\s*2026 수시 (?<track>\S.*?) 결과(?:\s*-\s*\S+캠퍼스)?\s*$/g,
  renameTrack: (t) =>
    ({
      '일반전형(학생부 종합)': '학생부종합(잠재력우수자_안성)',
      지역균형: '학생부교과(지역균형선발_안성)',
    })[t] ?? '',
  ignoreCells: /^(안성|평택)$/,
  skipDept,
  rows: [
    {
      pattern:
        /^(?<quota2026>\d+) [\d,]+ [\d.]+ \d+ \d+% (?:\d\.\d\d ){6,8}(?<filled2026>\d+) \d+\.\d\d(?: |$)/,
    },
  ],
});

/** 2026 의 학부 단위 모집(2027 에는 단과대학 단위로 바뀜)과 합계 행은 읽지 않는다 */
const NOT_2027 = /학부$|^소계$|^합계$/;

/** 2026 전공 → 2027 학과 (학과로 개편, 2027 모집요강 모집단위 표 기준) */
const MAJOR_TO_DEPT = [
  '문예창작미디어콘텐츠홍보',
  '영미언어문화',
  '행정',
  '법',
  '경영',
  '복지상담',
  '식품영양',
  '식물생명환경',
  '조경',
  '동물생명과',
  '동물응용과',
  '원예생명공',
  '응용생명공',
  '지역자원시스템공',
  '토목공',
  '환경공',
  '안전공',
  '식품생명공',
  '화학공',
  '응용수',
  'ICT로봇공',
  '기계공',
  '전자공',
  '전기공',
  '건축공',
  '컴퓨터공',
  '의류산업',
];

const config: UniversityConfig = {
  id: 'hknu',
  status: 'active',
  admissionSite: 'https://ipsi.hknu.ac.kr',
  note:
    '일반전형(교과)은 안성·평택 발표일이 달라 모집인원 표(캠퍼스 칸)로 나눌 수 없어 제외. ' +
    '2026 입시결과는 학과로 개편된 전공만 2027 학과명으로 연결(학부 단위 모집은 제외). 사회통합 결과는 충원 순위가 비어 있음',
  results: [
    {
      label: '한경국립대학교 2026학년도 수시 학생부 종합(잠재력우수자) 결과',
      url: 'https://ipsi.hknu.ac.kr/_common/new_download_file.php?menu=board&b_code=B_1_8&b_no=5091&field=file_nm',
      format: 'pdf',
      years: [2026],
      spec: resultSpec(NOT_2027),
    },
    {
      label: '한경국립대학교 2026학년도 지역균형 및 사회통합 결과',
      url: 'https://ipsi.hknu.ac.kr/_common/new_download_file.php?menu=board&b_code=B_1_8&b_no=5142&field=file_nm',
      format: 'pdf',
      years: [2026],
      spec: resultSpec(NOT_2027),
    },
  ],
  guide: {
    label: '한경국립대학교 2027학년도 수시 모집요강',
    url: 'https://ipsi.hknu.ac.kr/upload_data/mojib/20260623192023_0.pdf',
    format: 'pdf',
    // Ⅱ 모집단위 및 인원 — 빈 칸이 공란이라 PDF 좌표로 읽고 정원내 소계와 합이 맞는 행만 받음
    positionedQuotas: [
      {
        page: /입학[\s\S]*잠재력[\s\S]*소계/,
        headers: ['일반', '특수', '지역', '잠재력', '기회', '디자인', '체육', '일반#2', '특수교육'],
        matrix: [
          '', // 일반전형: 안성(12.17)·평택(11.18) 발표일이 달라 제외
          '',
          '학생부교과(지역균형선발_안성)',
          '학생부종합(잠재력우수자_안성)',
          '학생부종합(사회통합_안성)',
          '',
          '',
          '',
          '',
        ],
        totalHeader: '소계',
        ignoreWords: /^(안성|평택|합계)$/,
      },
    ],
    // Ⅲ 전형일정 / Ⅳ 세부전형별 04 전형일정 (세 전형 모두 서류·교과 100%, 고사 없음)
    schedules: [
      { track: '학생부교과(지역균형선발_안성)', first: null, exam: null, final: '2026-11-18T14:00' },
      { track: '학생부종합(잠재력우수자_안성)', first: null, exam: null, final: '2026-12-17T14:00' },
      { track: '학생부종합(사회통합_안성)', first: null, exam: null, final: '2026-12-17T14:00' },
    ],
  },
  deptAliases: Object.fromEntries(MAJOR_TO_DEPT.map((s) => [`${s}전공`, `${s}학과`])),
};

export default config;
