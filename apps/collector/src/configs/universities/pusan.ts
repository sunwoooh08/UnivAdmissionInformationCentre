import type { UniversityConfig } from '../types.js';

/** 모집요강 총괄표의 모집단위 이름 끝 표시(★ 교직과정, ♣ 전공자율선택제)를 뗀 이름 */
const MARKED = [
  'AI컴퓨팅자율전공', 'X-모빌리티융합학부', '간호학과', '건축학과', '경제학부', '교육학과', '국어교육과', '국어국문학과', '기계공학부', '노어노문학과', '대기환경과학과', '데이터사이언스학부', '독어독문학과', '문헌정보학과', '물리교육과', '물리학과', '미래도시건축환경융합전공', '미생물학과', '분자생물학과', '불어불문학과', '사학과', '사회학과', '산업공학부', '생명과학과', '생물교육과', '수학과', '수학교육과', '식품공학과', '식품영양학과', '실내환경디자인학과', '심리학과', '아동가족학과', '역사교육과', '영어교육과', '영어영문학과', '예술문화영상학과', '유아교육과', '윤리교육과', '응용생명융합학부', '의류학과', '일반사회교육과', '일어일문학과', '자유전공학부', '정치외교학과', '중어중문학과', '지구과학교육과', '지리교육과', '지질환경과학과', '철학과', '첨단소재자율전공', '첨단융합학부', '특수교육과', '한문학과', '항공우주공학과', '해양학과', '행정학과', '화학과', '화학교육과',
];

const ALL_DAY_FINAL = '2026-12-18T16:00';

const config: UniversityConfig = {
  id: 'pusan',
  status: 'active',
  admissionSite: 'https://go.pusan.ac.kr',
  note: '2027 모집인원은 총괄표(인문·자연 계열)에서 합계가 맞는 행만 반영. 실기·특수교육대상자 모집인원과 실기전형 일정(모집단위별로 다름)은 미반영',
  results: [
    {
      label: '부산대학교 2026학년도 대입전형결과',
      url: 'https://go.pusan.ac.kr/_common/new_download_file.asp?menu=boardfile&file_no=4251',
      format: 'pdf',
      years: [2026],
      spec: {
        // "1-1 학생부교과(학생부교과전형)" (목차 줄은 점선 … 이 있어 제외). 5-x 수능 표는 기본 sectionEnd 로 끊김
        section: /^\d-\d\s+(?<track>[^\s…][^…]*?\))\s*$/g,
        sectionMarker: /^\s*\d-\d\s|^\s*\d\s+모집단위별/,
        // 모집인원 지원인원 경쟁률 등록인원 최종추합번호 …
        rows: [
          // 특수교육대상자전형 표에는 경쟁률 칸이 없음
          { tracks: /특수교육대상자/, pattern: /^(?<quota2026>\d+) [\d,]+ \d+ (?<filled2026>\d+)(?: |$)/ },
          { pattern: /^(?<quota2026>\d+) [\d,]+ [\d.]+ \d+ (?<filled2026>\d+)(?: |$)/ },
        ],
      },
    },
  ],
  guide: {
    label: '부산대학교 2027학년도 수시모집요강',
    url: 'https://go.pusan.ac.kr/down/mojib/RF(0)_2607079150.pdf',
    format: 'pdf',
    // 4. 모집인원 총괄표 (빈 칸은 공백) — 좌표로 열을 찾고 '수시 모집 합계'와 맞는 행만 받는다
    positionedQuotas: [
      {
        page: /농어촌[\s\S]*배려자/,
        headers: ['교과', '인재#1', '농어촌', '종합', '인재#2', '의사', '저소', '배려자', '저소#2', '특성화', '', '논술', '인재#3'],
        matrix: [
          '학생부교과(학생부교과전형)',
          '학생부교과(지역인재전형)',
          '학생부교과(농어촌학생전형)',
          '학생부종합(학생부종합전형)',
          '학생부종합(지역인재전형)',
          '학생부종합(지역의사선발전형)',
          '학생부종합(지역인재 저소득층학생전형)',
          '학생부종합(사회배려자전형)',
          '학생부종합(저소득층학생전형)',
          '학생부종합(특성화고교졸업자전형)',
          '', // 특수교육대상자전형: 단과대학별 배정(합쳐진 칸)이고 합계에서 빠짐
          '논술(논술전형)',
          '논술(지역인재전형)',
        ],
        totalHeader: '합계',
        ignoreWords: /^(인문·사회|자연|부산|양산|밀양|광역|체육|인문|사회|과학|대학|공과|예술|사범)$/,
      },
    ],
    // 전형별 안내 '6 전형일정' (최초 합격자 발표 12. 18.(금) 16시)
    schedules: [
      { track: '학생부교과(학생부교과전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '학생부교과(지역인재전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '학생부교과(농어촌학생전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '학생부종합(학생부종합전형)', first: '2026-12-01T16:00', exam: ['2026-12-05', '2026-12-05'], final: ALL_DAY_FINAL },
      { track: '학생부종합(지역인재전형)', first: '2026-12-01T16:00', exam: ['2026-12-05', '2026-12-05'], final: ALL_DAY_FINAL },
      { track: '학생부종합(지역인재 저소득층학생전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '학생부종합(사회배려자전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '학생부종합(저소득층학생전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '학생부종합(특성화고교졸업자전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '학생부종합(특수교육대상자전형)', first: null, exam: null, final: ALL_DAY_FINAL },
      { track: '논술(논술전형)', first: null, exam: ['2026-11-28', '2026-11-28'], final: ALL_DAY_FINAL },
      { track: '논술(지역인재전형)', first: null, exam: ['2026-11-28', '2026-11-28'], final: ALL_DAY_FINAL },
      { track: '실기/실적(체육특기자전형)', first: null, exam: ['2026-11-05', '2026-11-06'], final: '2026-11-24T16:00' },
    ],
  },
  deptAliases: {
    ...Object.fromEntries(MARKED.flatMap((n) => [[`${n}★`, n], [`${n}♣`, n]])),
    // 총괄표 이름 → 입시결과 이름
    '전기공학전공★': '전기전자공학부(전기공학전공)',
    '전자공학전공★': '전기전자공학부(전자공학전공)',
    반도체공학전공: '전기전자공학부(반도체공학전공)',
    '조선·해양공학과★': '조선해양공학과',
  },
};

export default config;
