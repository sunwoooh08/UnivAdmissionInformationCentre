import type { UniversityConfig } from '../types.js';

/** 결과표의 전형 제목(□ …) → 2027 모집요강 전형명. 학생부 전형은 유형을 앞에 붙인다 */
const TRACKS: Record<string, string> = {
  지역균형: '학생부교과(지역균형)',
  '항공시스템공학 특별전형공군계약': '학생부교과(항공시스템공학 특별전형)',
  // 2027학년도부터 세종창의인재 → 세종인재 로 이름만 바뀜 (모집요강 '전형명 변경')
  '세종창의인재(면접형)': '학생부종합(세종인재 면접형)',
  '세종창의인재(서류형)': '학생부종합(세종인재 서류형)',
  기회균형: '학생부종합(기회균형)',
  '사회기여 및 배려자': '학생부종합(사회기여 및 배려자)',
  '서해 5도': '학생부종합(서해5도학생 특별전형)',
  특성화고교졸재직자전형기간자율화: '학생부종합(특성화고교졸 재직자 특별전형)',
  '사이버국방 특별전형육군계약': '학생부종합(사이버국방 특별전형)',
  '국방AI융합시스템공학 특별전형해군계약': '학생부종합(국방AI융합시스템공학 특별전형)',
  '국방AI로봇융합공학 특별전형해병대계약': '학생부종합(국방AI로봇융합공학 특별전형)',
};

const config: UniversityConfig = {
  id: 'sejong',
  status: 'active',
  admissionSite: 'https://ipsi.sejong.ac.kr',
  note:
    '2027 모집요강의 모집인원 표는 한 줄에 여러 모집단위(또는 빈 칸 행렬)라 읽지 않음. 결과표 중 숫자 칸이 붙어 찍힌 일부 행(주로 논술)은 빠짐. ' +
    '일정은 2026 결과의 모집단위가 2027에도 모두 있는 전형(세종인재 면접형·논술우수자)에만 적용 (지역균형은 역사학과·양자원자력공학과가 2027에 없어 제외)',
  results: [
    {
      label: '세종대학교 2026학년도 수시모집 입시결과 (2027학년도 수시모집 입시상담 자료)',
      url: 'https://ipsi.sejong.ac.kr/ipsi/assistant/entrance.do?mode=download&articleNo=2742&attachNo=2850',
      format: 'pdf',
      years: [2026],
      spec: {
        // □ 지역균형   □ 세종창의인재(면접형)   □ 논술우수자 …
        section: /^\s*□\s*(?<track>\S.*?)\s*$/g,
        sectionMarker: /^\s*□/,
        renameTrack: (t) => TRACKS[t] ?? t,
        skipDept: /요약|^(계|합계|소계|모집단위|계열)$/,
        // 모집인원 지원인원 경쟁률 마지막합격자예비번호 충원율 …  (예비번호·충원율 '-' 는 충원 없음/비공개 → 건너뜀)
        rows: [{ pattern: /^(?<quota2026>\d+) [\d,]+ \d+\.\d\d (?<filled2026>\d+|-) (?:\d+\.\d\d|-)(?: |$)/ }],
      },
    },
  ],
  guide: {
    label: '세종대학교 2027학년도 수시모집요강',
    url: 'https://ipsi.sejong.ac.kr/cms/etcResourceDown.do?site=$cms$JYBwzsQ&key=$cms$MoUwVg9gdg5g+gVSgSwG4gE4GdkBcCecAogIYYA2hAggCYC2yWO0cA4gK7I0jnJQhY4AJgAMQgOwA6AA40AZkA',
    format: 'pdf',
    // 세부 전형별 안내 ➄ 전형일정 / 원서접수, 전형일정 및 합격자 발표 안내 (최초합격자 발표 12.18.(금) 17시 이후)
    schedules: [
      {
        track: '학생부종합(세종인재 면접형)',
        first: '2026-11-13T17:00',
        // 창의소프트학부 11.21.(토), 인문·자연계열 11.22.(일)
        exam: ['2026-11-21', '2026-11-22'],
        final: '2026-12-18T17:00',
      },
      // 인문 11.28.(토), 자연 11.29.(일)
      { track: '논술우수자', first: null, exam: ['2026-11-28', '2026-11-29'], final: '2026-12-18T17:00' },
    ],
  },
};

export default config;
