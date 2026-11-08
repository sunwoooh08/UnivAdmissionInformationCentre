import type { ResultsSpec } from '../../extract/results.js';
import type { ResultsSource, UniversityConfig } from '../types.js';

/** 모집단위가 아닌 칸 (기본 목록 + "자연계열 전체"·"전형 전체" 같은 합계 행) */
const NOT_DEPT =
  /^(계|합계|소계|총계|전체|모집단위|단과대학|대학|학부|계열|구분|평균|비고|-)$|(^|\s)(계|합계|소계|총계)$|학년도|입학전형|입시결과|선발결과|전형결과|전체$/;
/**
 * 체육특기자(포지션별, 비율은 전형 전체 기준), 농어촌·특성화고(여러 학과를 묶은 칸),
 * 재직자(성인 대상), 서해5도(계열 전체) 표는 학과별 값이 아니라서 제외
 */
const EXCLUDED_TRACKS = /체육특기자|농어촌|특성화고|재직자|서해5도/;
/** 2024·2025 면접형에 있었지만 2027 면접형에는 없는 모집단위 (2027 은 서류형·소프트웨어우수인재로 선발) */
const LEFT_INTERVIEW_TRACK = ['컴퓨터정보공학부', '소프트웨어학부', '정보융합학부', 'AI로봇전공'];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 입시결과 표: [수시] 학생부종합(광운참빛인재전형-면접형)
 *   모집단위  모집인원 지원인원 경쟁률 학생부등급 [논술성적] 충원최종예비번호 충원합격비율(%) [비고]
 * 등급·논술 칸은 비어 있을 수 있고, 충원 칸이 비어 있는 행은 읽지 않는다.
 * dropDepts: 2027 에 그 전형으로 뽑지 않는 모집단위 (지난 결과가 올해 전형에 붙지 않게)
 */
function resultSpec(year: number, skipTrack: RegExp, dropDepts: string[] = []): ResultsSpec {
  const drop = dropDepts.length ? `|^(${dropDepts.map(escape).join('|')})$` : '';
  return {
    section: /^\s*\[수시\]\s*(?<track>\S.*?)\s*$/g,
    sectionMarker: /^\s*\[(수시|정시)\]/,
    skipTrack,
    skipDept: new RegExp(NOT_DEPT.source + drop),
    ignoreCells: /^(인문|자연)$/,
    rows: [
      {
        pattern: new RegExp(
          `^(?<quota${year}>\\d+) [\\d,]+ \\d+\\.\\d+ (?:[\\d.]+ ){0,2}?(?<filled${year}>\\d+) \\d+\\.\\d(?: |$)`,
        ),
      },
    ],
  };
}

const resultUrl = (no: number) =>
  `https://iphak.kw.ac.kr/_common/new_download_file.php?menu=board&b_code=B_1_8&b_no=${no}&field=file_nm`;
const resultLabel = (year: number) => `광운대학교 ${year}학년도 수시모집 최종등록자 평균성적 및 충원합격 비율`;

const NOT_INTERVIEW = new RegExp(`${EXCLUDED_TRACKS.source}|면접형`);
const ONLY_INTERVIEW = /^(?!.*면접형)/;

const RESULTS: ResultsSource[] = [
  { year: 2026, no: 44580, skip: EXCLUDED_TRACKS, drop: [] as string[], suffix: '' },
  { year: 2025, no: 43900, skip: NOT_INTERVIEW, drop: ['정보제어·지능시스템전공'], suffix: '' },
  {
    year: 2025,
    no: 43900,
    skip: ONLY_INTERVIEW,
    drop: ['정보제어·지능시스템전공', ...LEFT_INTERVIEW_TRACK],
    suffix: ' (면접형)',
  },
  // 2024 는 경영학부·반도체시스템공학부를 학부 단위로 뽑아 2027 모집단위와 다름
  { year: 2024, no: 43161, skip: NOT_INTERVIEW, drop: ['경영학부', '반도체시스템공학부'], suffix: '' },
  {
    year: 2024,
    no: 43161,
    skip: ONLY_INTERVIEW,
    drop: ['경영학부', '반도체시스템공학부', ...LEFT_INTERVIEW_TRACK],
    suffix: ' (면접형)',
  },
].map(({ year, no, skip, drop, suffix }) => ({
  label: resultLabel(year) + suffix,
  url: resultUrl(no),
  format: 'pdf' as const,
  years: [year],
  spec: resultSpec(year, skip, drop),
}));

/** 모집요강 전형 제목(공백 제거) → 쓸 전형명. 목록에 없는 전형은 읽지 않는다 */
const GUIDE_TRACKS: Record<string, string> = {
  '광운참빛인재전형Ⅰ-면접형': '학생부종합(광운참빛인재전형Ⅰ-면접형)',
  '광운참빛인재전형Ⅱ-서류형': '학생부종합(광운참빛인재전형Ⅱ-서류형)',
  소프트웨어우수인재전형: '학생부종합(소프트웨어우수인재전형)',
  지역균형전형: '학생부교과(지역균형전형)',
  논술우수자전형: '논술(논술우수자전형)',
};

/**
 * 모집요강의 전형별 "1. 모집단위 및 모집인원" 표는 좌우 두 칸이고, 전형명은 표 위 제목 줄(학생부종합【…】)에만 있다.
 * 제목 줄을 장(chapter)으로 보고, 표 머리글(계열 대학 모집단위 모집인원 ×2)로 좌우 칸을 나눈다.
 * 목록에 없는 전형의 제목은 chapterMarker 로 장을 끝내 그 표는 읽지 않는다.
 */
const guideQuotaSpec: ResultsSpec = {
  chapter:
    /^\s*(?:학생부종합|학생부교과|논술)【(?<track>광운참빛인재전형Ⅰ\s*-\s*면접형|광운참빛인재전형Ⅱ\s*-\s*서류형|소프트웨어우수인재전형|지역균형전형|논술우수자전형)】\s*$/,
  chapterMarker: /^\s*(?:학생부종합|학생부교과|논술|실기\/실적)【[^】]+】\s*$/,
  renameTrack: (raw) => GUIDE_TRACKS[raw.replace(/\s+/g, '')] ?? raw,
  section: /계열(?=\s+대학\s+모집단위\s+모집인원)/g,
  // 표 바로 아래 "2. 지원자격" 에서 끝
  sectionEnd: /^\s*\d\.\s*지원자격|정시|수능/,
  // 모집인원 뒤에는 단과대학·계열 글자 조각만 올 수 있다
  rows: [{ pattern: /^(?<quotaNow>\d+)(?: [^\d\s]+)*$/ }],
};

const config: UniversityConfig = {
  id: 'kw',
  status: 'active',
  admissionSite: 'https://iphak.kw.ac.kr',
  note: '입시결과에서 여러 줄로 나뉜 모집단위(반도체시스템공학부)와 충원 칸이 빈 행은 빠짐. 농어촌·특성화고 등 묶음 모집단위 전형은 제외',
  results: RESULTS,
  guide: {
    label: '광운대학교 2027학년도 신입학 수시 모집요강',
    url: 'https://iphak.kw.ac.kr/upload_data/mojib/20260526155135_27.pdf',
    format: 'pdf',
    quotas: [guideQuotaSpec],
    // Ⅳ. 원서접수 및 전형 일정
    schedules: [
      { track: '학생부교과(지역균형전형)', first: null, exam: null, final: '2026-11-06T15:00' },
      {
        track: '학생부종합(광운참빛인재전형Ⅰ-면접형)',
        first: '2026-10-28T15:00',
        exam: ['2026-10-31', '2026-11-01'],
        final: '2026-11-06T15:00',
      },
      { track: '학생부종합(광운참빛인재전형Ⅱ-서류형)', first: null, exam: null, final: '2026-11-06T15:00' },
      {
        track: '학생부종합(소프트웨어우수인재전형)',
        first: '2026-10-28T15:00',
        exam: ['2026-10-31', '2026-11-01'],
        final: '2026-11-06T15:00',
      },
      { track: '논술(논술우수자전형)', first: null, exam: ['2026-11-28', '2026-11-29'], final: '2026-12-18T15:00' },
    ],
  },
  trackAliases: {
    '학생부종합(광운참빛인재전형-면접형)': '학생부종합(광운참빛인재전형Ⅰ-면접형)',
    '학생부종합(광운참빛인재전형-서류형)': '학생부종합(광운참빛인재전형Ⅱ-서류형)',
  },
  deptAliases: {
    // 2027 모집요강 주요사항: 학과명칭 변경 영어산업학과 → 영어영문학과
    영어산업학과: '영어영문학과',
    건축학과: '건축학과(5년제)',
  },
};

export default config;
