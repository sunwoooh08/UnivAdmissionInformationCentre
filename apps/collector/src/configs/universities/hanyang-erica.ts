import type { UniversityConfig } from '../types.js';
import type { ResultsSpec } from '../../extract/results.js';

const RESULT_URL = 'https://goerica.hanyang.ac.kr/upload/BBS0062/20260423200430A2SV89.PDF';
const RESULT_LABEL = '한양대학교 ERICA 2024~2026학년도 입시결과 및 선발현황';
const DEFAULT_SKIP =
  /^(계|합계|소계|총계|전체|모집단위|단과대학|대학|학부|계열|구분|평균|비고|-)$|(^|\s)(계|합계|소계|총계)$|학년도|입학전형|입시결과|선발결과|전형결과/;

const Y = '(?:[\\d.]+|-)';
/** 결과표 공통: 교과·종합 표는 2024~2026 3개년, 고른기회 표는 2026 한 해 */
const resultSpec = (opts: { jonghap: string; skipDept: RegExp }): ResultsSpec => ({
  // "2024~2026학년도 수시모집 학생부교과전형 입시결과" / "2026학년도 수시모집 학생부종합(고른기회)전형 입시결과"
  section: /수시모집 (?<track>학생부교과|학생부종합(?:\(고른기회\))?)전형 입시결과/g,
  // 같은 제목 아래 등급표(최초합격자 평균등급 …)는 건너뜀
  sectionMarker: /최초합격자\s+평균등급/,
  renameTrack: (t) =>
    t === '학생부교과' ? '학생부교과(지역균형선발)' : t === '학생부종합' ? opts.jonghap : t,
  skipDept: opts.skipDept,
  rows: [
    // 모집인원 2024 2025 2026 / 경쟁률 ×3 / 실질경쟁률 ×3 / 충원율(%) ×3
    {
      tracks: /교과/,
      pattern: new RegExp(
        `^(?<quota2024>\\d+|-) (?<quota2025>\\d+|-) (?<quota2026>\\d+|-) ${Y} ${Y} ${Y} ${Y} ${Y} ${Y} (?<rate2024>${Y}) (?<rate2025>${Y}) (?<rate2026>${Y})$`,
      ),
    },
    // 고른기회: 모집인원 경쟁률 충원율(%) [평균등급]
    { tracks: /고른기회/, pattern: /^(?<quota2026>\d+) [\d.]+ (?<rate2026>[\d.]+)(?: [\d.]+)?$/ },
    // 종합: 모집인원 ×3 / 경쟁률 ×3 / 충원율(%) ×3
    {
      tracks: /종합/,
      pattern: new RegExp(
        `^(?<quota2024>\\d+|-) (?<quota2025>\\d+|-) (?<quota2026>\\d+|-) ${Y} ${Y} ${Y} (?<rate2024>${Y}) (?<rate2025>${Y}) (?<rate2026>${Y})$`,
      ),
    },
  ],
});

const FINAL = '2026-12-18T18:00';

const config: UniversityConfig = {
  id: 'hanyang-erica',
  status: 'active',
  admissionSite: 'https://goerica.hanyang.ac.kr',
  note: '학생부종합 결과표는 서류형·면접형 합산표 (면접형 = LIONS자율전공학부 전계열, 2025·2026 모집요강 기준). 학부 모집 행은 미반영',
  results: [
    {
      // 종합 표의 '전계열' 행은 면접형이라 여기서는 뺌
      label: RESULT_LABEL,
      url: RESULT_URL,
      format: 'pdf',
      years: [2026, 2025, 2024],
      spec: resultSpec({
        jonghap: '학생부종합(서류형)',
        skipDept: new RegExp(`${DEFAULT_SKIP.source}|^전계열$`),
      }),
    },
    {
      // 'LIONS자율전공학부 전계열' 행만: 교과 표 → 지역균형선발, 종합 표 → 면접형
      label: RESULT_LABEL,
      url: RESULT_URL,
      format: 'pdf',
      years: [2026, 2025, 2024],
      spec: resultSpec({ jonghap: '학생부종합(면접형)', skipDept: /^(?!전계열$)/ }),
    },
  ],
  guide: {
    label: '한양대학교 ERICA 2027학년도 수시모집요강',
    url: 'https://goerica.hanyang.ac.kr/upload/BBS0061/202610071301429KPHA9.PDF',
    format: 'pdf',
    quotas: [
      {
        // 전형별 안내 "학생부교과(지역균형선발) 전형 / 1. 모집인원 : 531명" 아래 모집단위 표
        section: /^\s*(?<track>학생부교과\(지역균형선발\)|학생부종합\((?:서류형|면접형|고른기회)\))\s*전형\s*$/g,
        // "2. 지원자격" 부터는 표가 아님
        sectionMarker: /^\s*[2-9]\.\s/,
        // '학부 모집'은 학부마다 같은 이름이라 어느 학부인지 알 수 없어 뺌
        skipDept: new RegExp(`${DEFAULT_SKIP.source}|^학부 모집$`),
        rows: [{ pattern: /^(?<quotaNow>\d+)$/ }],
      },
    ],
    // 전형일정 (최초합격자 발표 12. 18.(금) 18:00 예정, 면접형 1단계 11. 13.(금) 18:00, 면접 11. 21.(토))
    schedules: [
      { track: '학생부교과(지역균형선발)', first: null, exam: null, final: FINAL },
      { track: '학생부종합(서류형)', first: null, exam: null, final: FINAL },
      { track: '학생부종합(면접형)', first: '2026-11-13T18:00', exam: ['2026-11-21', '2026-11-21'], final: FINAL },
      { track: '학생부종합(고른기회)', first: null, exam: null, final: FINAL },
    ],
  },
  deptAliases: {
    전계열: 'LIONS자율전공학부(전계열)',
    자연계열: 'LIONS자율전공학부(자연계열)',
    인문사회계열: 'LIONS자율전공학부(인문사회계열)',
    '커뮤니케이션&컬처 미디어학과': '미디어학과',
  },
};

export default config;
