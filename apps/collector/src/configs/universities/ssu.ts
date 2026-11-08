import type { UniversityConfig } from '../types.js';

/** 2024~2026 'SSU미래인재전형'은 2027에 면접형(기존 방식)과 서류형(신설)으로 나뉨 → 결과는 면접형에 연결 */
const renameTrack = (t: string): string => {
  if (t.startsWith('SSU미래인재전형(')) return t;
  if (t.startsWith('SSU미래인재')) return 'SSU미래인재전형(면접형)';
  if (/교과우수자|학생부우수자/.test(t)) return '교과우수자전형';
  return t;
};

/** 모집요강 전형별 모집단위 표는 왼쪽(인문·사회·경상)·오른쪽(자연·공학·IT) 두 칸으로 나뉘어 있다 */
const GUIDE_SECTION =
  /^\s{15,}(?<track>SSU미래인재전형\((?:면접형|서류형)\)|교과우수자전형-학교장 추천|논술우수자전형|기회균형전형|SW우수자전형)\s*$/g;
const GUIDE_END = /^\s{0,4}※|^\s*[가-하]\s+지원자격|전형료|정시|수능\s*위주/;
const COLLEGE = '인문대학|법과대학|사회과학|대학|경제통상|경영대학|자연과학|공과대학|IT대학|AI대학|베어드학부대학|인문|경상|자연';
const GUIDE_SKIP = new RegExp(`^(${COLLEGE}|◆|계|합계|소계|총계|모집단위|모집인원|구분)$`);
/** 왼쪽 칸 모집단위 (오른쪽 칸을 읽을 때 버린다) */
const LEFT_DEPTS =
  '기독교학과|국어국문학과|영어영문학과|독어독문학과|불어불문학과|중어중문학과|일어일문학과|철학과|사학과|법학과|국제법무학과|' +
  '사회복지학부|행정학부|정치외교학과|정보사회학과|언론홍보학과|평생교육학과|경제학과|글로벌통상학과|경영학부|회계학과|벤처중소기업학과|금융학부';

const config: UniversityConfig = {
  id: 'ssu',
  status: 'active',
  admissionSite: 'https://admission.ssu.ac.kr',
  note: '2024~2026 SSU미래인재전형 결과는 2027 SSU미래인재전형(면접형)에 연결. 특수교육대상자·예체능 전형은 표 배치 때문에 제외',
  results: [
    {
      label: '숭실대학교 2026학년도 입시결과 통계',
      url: 'https://admission.ssu.ac.kr/incs/incFiledo.asp?mode=1&number=241&cot=1',
      format: 'pdf',
      years: [2026],
      spec: {
        // 전형명은 유형(학생부종합 등) 아래 줄에 따로: "        SSU미래인재전형" / "SW우수자전형 …… 특수교육대상자전형"(좌우 두 표)
        section:
          /(?<=^\s{10,}|\s{2})(?<track>SSU미래인재전형|교과우수자전형(?:\(구 학생부우수자전형\))?|논술우수자전형|기회균형전형|SW우수자전형|특수교육대상자전형)(?=\s{2,}|\s*$)/g,
        // 3개년 추이·고교유형 그림 쪽은 끊는다 (충원율만 있고 모집인원이 없음)
        sectionMarker: /한눈에 보는|3개년 추이|고교유형|유형별 현황|^\s*(학생부종합|학생부교과|논술|실기\/실적|실기위주|수능위주)(\s{2,}|\s*$)/,
        // 특수교육대상자 표는 제목보다 왼쪽에서 시작해 좌우 구분이 안 됨
        skipTrack: /특수교육대상자/,
        // 모집인원 지원인원 경쟁률 [실질경쟁률(논술)] 등록인원 충원인원 충원율
        rows: [{ pattern: /^(?<quota2026>\d+) [\d,]+ [\d.]+:1 (?:[\d.]+:1 )?\d+ (?<filled2026>\d+) \d+%/ }],
        renameTrack,
      },
    },
    {
      label: '숭실대학교 2025학년도 입시결과 통계',
      url: 'https://admission.ssu.ac.kr/incs/incFiledo.asp?mode=1&number=238&cot=1',
      format: 'pdf',
      years: [2025],
      spec: {
        // 쪽 첫 줄: "SSU미래인재전형                학생부종합"
        section: /^(?<track>SSU미래인재전형|학생부우수자전형|논술우수자전형|기회균형전형)(?=\s{2,}(?:학생부종합|학생부교과|논술)(?:\s{2,}|\s*$))/g,
        // SW우수자 표는 특수교육대상자 표와 제목 줄이 어긋나 있어 읽지 않음
        sectionMarker: /^(SW우수자전형|예체능)|특수교육대상자전형|한눈에 보는|3개년 추이/,
        rows: [{ pattern: /^(?<quota2025>\d+) [\d,]+ [\d.]+:1 (?:[\d.]+:1 )?\d+ (?<filled2025>\d+) \d+%/ }],
        renameTrack,
      },
    },
  ],
  guide: {
    label: '숭실대학교 2027학년도 수시모집요강',
    url: 'https://admission.ssu.ac.kr/upload/SSU(2)_26092812337.pdf',
    format: 'pdf',
    quotas: [
      // 왼쪽 칸: 줄의 첫 모집단위
      {
        section: GUIDE_SECTION,
        sectionEnd: GUIDE_END,
        skipDept: GUIDE_SKIP,
        rows: [{ pattern: /^(?<quotaNow>\d+)(?: |$)/ }],
        renameTrack,
      },
      // 오른쪽 칸: 단과대학명과 왼쪽 칸 모집단위를 버리고 남은 모집단위
      {
        section: GUIDE_SECTION,
        sectionEnd: GUIDE_END,
        skipDept: GUIDE_SKIP,
        ignoreCells: new RegExp(`^(${COLLEGE}|◆|(${LEFT_DEPTS})◆?)$`),
        rows: [{ pattern: /^(?<quotaNow>\d+)(?: |$)/ }],
        renameTrack,
      },
    ],
    // 1. 원서접수 및 전형일정 / 각 전형 '마. 전형일정'
    schedules: [
      { track: 'SSU미래인재전형(면접형)', first: '2026-11-23T10:00', exam: ['2026-11-27', '2026-11-27'], final: '2026-12-18T10:00' },
      { track: 'SSU미래인재전형(서류형)', first: null, exam: null, final: '2026-12-18T10:00' },
      { track: '교과우수자전형', first: null, exam: null, final: '2026-12-18T10:00' },
      { track: '논술우수자전형', first: null, exam: ['2026-11-21', '2026-11-21'], final: '2026-12-18T10:00' },
      { track: '기회균형전형', first: '2026-11-23T10:00', exam: ['2026-11-28', '2026-11-28'], final: '2026-12-18T10:00' },
      {
        track: 'SW우수자전형',
        category: '학생부종합',
        first: '2026-11-23T10:00',
        exam: ['2026-11-28', '2026-11-28'],
        final: '2026-12-18T10:00',
      },
    ],
  },
};

export default config;
