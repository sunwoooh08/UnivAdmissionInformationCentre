import type { UniversityConfig } from '../types.js';
import type { ResultsSpec } from '../../extract/results.js';

/** 2026학년도 대학입학전형결과 현황표 (전형마다 파일 하나) */
const RESULT_SPEC: ResultsSpec = {
  // [학생부교과(학생부교과전형)]  [학생부종합(학생부종합Ⅰ전형)] …
  section: /^\s*\[(?<track>학생부(?:교과|종합)\([^\]]+\))\]\s*$/g,
  ignoreCells: /^(인문|자연|예체능)$/,
  // 모집인원 지원인원 예비순위 최초합격자 내신평균 …  (예비순위가 빈 칸이면 충원 없음/비공개로 보고 건너뜀)
  rows: [{ pattern: /^(?<quota2026>\d+) \d+ (?<filled2026>\d+) \d\.\d\d(?: |$)/ }],
};

const RESULT_FILES: [string, string, string][] = [
  ['학생부교과전형', 'FILE_000000000003227XyCjE', '0'],
  ['지역인재전형', 'FILE_000000000003227XyCjE', '1'],
  ['학생부종합Ⅰ 전형', 'FILE_000000000003237SxAbe', '0'],
  ['학생부종합Ⅱ 전형', 'FILE_000000000003237SxAbe', '1'],
  ['sw우수인재 전형', 'FILE_000000000003237SxAbe', '2'],
];

/**
 * 모집요강 '세부 전형별 안내 1. 모집단위 및 모집인원' 표는 좌우 두 표로 찍힌다.
 * 장 제목 "[학생부종합 : 학생부종합(학생부종합Ⅰ전형)]" 이 전형을 정하고,
 * 머리글 줄("단과대학 계열 모집단위 모집인원  단과대학 …")의 '단과대학' 위치로 좌우를 나눈다.
 */
const QUOTA_SPEC: ResultsSpec = {
  chapter: /^\s*\[[^\]:]+:\s*(?<track>[^\]]+?)\s*\]\s*$/,
  section: /(?<track>단과대학)(?=\s+계열)/g,
  // 결과 파일이 있는 다섯 전형만 (나머지는 표 모양이 달라 검증하지 않음)
  skipTrack: /^(?!학생부교과\((학생부교과|지역인재)전형\)$|학생부종합\((학생부종합[ⅠⅡ]|sw우수인재)전형\)$)/,
  ignoreCells: /^(인문|자연|예체능)$/,
  // 표 아래 "※ 2027학년도 입학정원 조정에 따라 …" 에서 끝냄
  sectionEnd: /입학정원\s*조정에\s*따라|정시|수능\s*위주/,
  rows: [{ pattern: /^(?<quotaNow>\d+)$/ }],
};

const config: UniversityConfig = {
  id: 'chungbuk',
  status: 'active',
  admissionSite: 'https://ipsi.chungbuk.ac.kr',
  note:
    '입시결과의 예비순위가 빈 칸인 모집단위는 충원 없음/비공개를 구분할 수 없어 제외. ' +
    '2026 소프트웨어학부 결과는 2027 인공지능학부(인공지능·소프트웨어전공, 전형별 모집인원 거의 같음)에 이어 붙임',
  results: RESULT_FILES.map(([name, file, sn]) => ({
    label: `충북대학교 2026학년도 대학입학전형결과 현황표(수시 ${name})`,
    url: `https://ipsi.chungbuk.ac.kr/cmm/fms/FileDown.do?atchFileId=${file}&fileSn=${sn}`,
    format: 'pdf' as const,
    years: [2026],
    spec: RESULT_SPEC,
  })),
  deptAliases: {
    '목재‧종이과학과': '목재·종이과학과', // 모집요강은 U+2027, 결과표는 U+00B7
    소프트웨어학부: '인공지능학부',
  },
  guide: {
    label: '충북대학교 2027학년도 대학입학전형 수시 신입생 모집요강',
    url: 'https://ipsi.chungbuk.ac.kr/cmm/fms/FileDown.do?atchFileId=FILE_0000000000032455j8Fg&fileSn=13',
    format: 'pdf',
    quotas: [QUOTA_SPEC],
    // Ⅲ 전형일정 / 세부 전형별 '6. 전형일정': 다섯 전형 모두 일괄합산(면접 없음), 최초합격자 발표 2026.12.18.(금) 17:00
    schedules: [
      '학생부교과(학생부교과전형)',
      '학생부교과(지역인재전형)',
      '학생부종합(학생부종합Ⅰ전형)',
      '학생부종합(학생부종합Ⅱ전형)',
      '학생부종합(sw우수인재전형)',
    ].map((track) => ({ track, first: null, exam: null, final: '2026-12-18T17:00' })),
  },
};

export default config;
