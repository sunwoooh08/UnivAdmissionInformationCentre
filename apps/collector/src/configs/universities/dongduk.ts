import type { ResultsSpec } from '../../extract/results.js';
import type { UniversityConfig } from '../types.js';

const DEFAULT_SKIP =
  /^(계|합계|소계|총계|전체|모집단위|단과대학|대학|학부|계열|구분|평균|비고|-)$|(^|\s)(계|합계|소계|총계)$|학년도|입학전형|입시결과|선발결과|전형결과/;

/** 04. 전형별 안내 — 장 제목 "학생부종합 [동덕창의리더전형] (정원 내)" 아래 '모집단위별 모집인원' 표 (모집단위 전체모집인원 그전형) */
const base: ResultsSpec = {
  chapter: /^\s*(?<category>학생부종합|학생부교과|논술|실기\/실적)\s*\[(?<track>[^\]]+)\]\s*\(정원\s*[내외]\)\s*$/,
  section: /(?<track>모집단위)(?=\s+전체모집인원)/g,
  sectionEnd: /지원자격|전형요소|정시|수능\s*위주/,
  rows: [{ pattern: /^\d+ (?<quotaNow>\d+)(?: |$)/ }],
  renameTrack: (t) => t.replace(/\s*(특별)?전형$/, ''),
};

const config: UniversityConfig = {
  id: 'dongduk',
  status: 'active',
  admissionSite: 'https://ipsi.dongduk.ac.kr',
  note:
    '모집요강만 반영. 입시결과(수시 충원합격 인원현황 PDF)는 전형별 모집인원·충원 칸이 빈칸 행렬이라 지금 추출기로 못 읽음. ' +
    '동덕창의리더 약학과는 발표일이 달라 제외, 실기·특기자 전형 제외',
  guide: {
    label: '동덕여자대학교 2027학년도 수시모집요강',
    url: 'https://ipsi.dongduk.ac.kr/afile/fileDownloadById/26062628313eQw1L',
    format: 'pdf',
    quotas: [
      { ...base, skipTrack: /동덕창의리더|실기|특기자|재직자/ },
      // 동덕창의리더 약학과는 최초합격 발표가 12.18 이라 따로 두지 않음
      { ...base, skipTrack: /^(?!동덕창의리더)/, skipDept: new RegExp(`${DEFAULT_SKIP.source}|^약학과$`) },
    ],
    // 01. 전형일정 (최초합격자 발표: 동덕창의리더(약학과 제외)·기회균형 11.17.(화) 17:00 / 교과우수자·논술우수자 12.18.(금) 17:00)
    schedules: [
      {
        track: '동덕창의리더',
        first: '2026-10-27T17:00',
        exam: ['2026-10-31', '2026-11-01'],
        final: '2026-11-17T17:00',
      },
      { track: '기회균형', first: null, exam: null, final: '2026-11-17T17:00' },
      { track: '학생부교과우수자', first: null, exam: null, final: '2026-12-18T17:00' },
      { track: '논술우수자', first: null, exam: ['2026-11-28', '2026-11-28'], final: '2026-12-18T17:00' },
    ],
  },
};

export default config;
