import type { UniversityConfig } from '../types.js';
import type { ResultsSpec } from '../../extract/results.js';

/** 2026 결과표의 전형 제목 → 2027 모집요강 전형명 ([ ] 는 ( ) 로 정리된 뒤의 이름) */
const RESULT_TRACKS: Record<string, string> = {
  '일반학생전형(교과)': '일반(교과)',
  '지역인재전형(교과)/ 지역인재전형(기초)': '지역(교과)', // 간호학과[지역(기초)] 행은 skipDept 로 뺌
  농어촌학생전형: '농어촌학생전형(교과, 면접)',
  '기초생활수급자, 차상위계층, 한부모가족지원 대상자전형': '기초생활수급자,차상위계층,한부모가족 지원대상자전형',
  '일반학생전형(실기)': '일반(실기)',
  학생부종합전형: '학생부종합',
};

const DEFAULT_SKIP = /^(계|합계|소계|총계|모집단위|구분|-)$/;

/** 전형별 세부 사항: "1    학생부위주[교과] - 일반[교과]" → 모집단위·모집인원 세 칸짜리 표 */
const chapterQuotas = (skipTrack: RegExp, skipDept: RegExp): ResultsSpec => ({
  chapter: /^\s*\d{1,2}\s+(?<category>학생부위주\[(?:교과|종합)\]|실기\/실적위주)\s*-\s*(?<track>\S.*?)\s*$/,
  // 요강 끝의 "1 학생부위주교과전형 입시 결과" 이후는 읽지 않음
  chapterMarker: /^\s*\d{1,2}\s+\S.*입시\s*결과/,
  section: /(?<track>모집단위)/g,
  sectionEnd: /^\s*전형방법|정시|수능\s*위주/,
  skipTrack,
  skipDept,
  rows: [{ pattern: /^(?<quotaNow>\d+)$/ }],
});

/** 교과 100% 전형: 최종합격자 발표 10.26.(월) 16:00 */
const GYOGWA_FINAL = '2026-10-26T16:00';

const config: UniversityConfig = {
  id: 'konyang',
  status: 'active',
  admissionSite: 'https://ipsi.konyang.ac.kr',
  note:
    'robots.txt 는 ".pdf" 로 끝나는 경로만 Disallow — 파일은 /cmm/fms/FileDown.do?… 로 받으므로 해당 없음(확인 필요하면 입학처 문의). ' +
    '의학과(일반·지역 최저, 지역기초, 지역의사)는 표 모양이 달라(행=전형) 제외, 농어촌 의학과(면접)도 일정이 달라 제외',
  results: [
    {
      label: '건양대학교 2026학년도 입시결과(최종)',
      url: 'https://ipsi.konyang.ac.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000220824&fileSn=0',
      format: 'pdf',
      years: [2026],
      spec: {
        // "가. 일반학생전형[교과] : 교과 100%" (라. 의학과 표는 행이 전형이라 sectionMarker 로 끊음)
        section: /^\s*[가-사]\.\s*(?<track>[^:]+?)\s*:\s/g,
        sectionMarker: /^\s*[가-하]\.\s|^\s*\d\s{2,}\S/,
        renameTrack: (t) => RESULT_TRACKS[t] ?? t,
        skipDept: /지역\(기초\)|^(계|합계|소계|모집단위|-)$/,
        // 모집인원 지원인원 지원율 등록인원 (등급 최고·평균·50%·70%·최저, 1명이면 칸이 비거나 '등록자 없음') 최종등록자 후보순위
        rows: [{ pattern: /^(?<quota2026>\d+) (?:\d+|-) [\d.]+ (?:\d+|-) .*?(?<filled2026>\d+|-)$/ }],
      },
    },
  ],
  deptAliases: { '간호학과[지역(교과)]': '간호학과' },
  guide: {
    label: '건양대학교 2027학년도 수시전형 모집요강',
    url: 'https://ipsi.konyang.ac.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000223383&fileSn=0',
    format: 'pdf',
    quotas: [
      chapterQuotas(/최저|지역\(기초\)|지역의사|농어촌/, DEFAULT_SKIP),
      // 농어촌 의학과는 [면접] 전형(1단계 12.11, 면접 12.12, 최종 12.16)이라 교과 일정과 섞이지 않게 뺌
      chapterQuotas(/^(?!농어촌)/, /^의학과$|^(계|합계|소계|총계|모집단위|구분|-)$/),
    ],
    // 전형일정 표 (최종합격자 발표: 교과·실기 10.26.(월) 16:00, 학생부종합 11.11.(수) 16:00, 군사학 12.16.(수) 16:00)
    schedules: [
      ...['일반(교과)', '지역(교과)', '농어촌학생전형(교과, 면접)', '기초생활수급자,차상위계층,한부모가족 지원대상자전형', '특성화고교졸업자전형', '특수교육대상자전형'].map(
        (track) => ({ track, category: '학생부교과' as const, first: null, exam: null, final: GYOGWA_FINAL }),
      ),
      { track: '지역(면접)', category: '학생부교과', first: '2026-10-12T16:00', exam: ['2026-10-17', '2026-10-17'], final: GYOGWA_FINAL },
      { track: '군사학전형', category: '학생부교과', first: '2026-09-28T16:00', exam: ['2026-10-15', '2026-10-16'], final: '2026-12-16T16:00' },
      { track: '학생부종합', first: null, exam: null, final: '2026-11-11T16:00' },
      { track: '일반(실기)', first: null, exam: ['2026-09-30', '2026-09-30'], final: GYOGWA_FINAL },
      { track: '특기자전형', category: '실기/실적', first: null, exam: null, final: GYOGWA_FINAL },
    ],
  },
};

export default config;
