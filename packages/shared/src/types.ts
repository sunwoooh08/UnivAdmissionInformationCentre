/** 날짜는 "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm" (KST 기준) 문자열. */
export type DateString = string;

export type Category = '학생부종합' | '학생부교과' | '논술' | '실기/실적' | '기타';

export const CATEGORIES: readonly Category[] = ['학생부종합', '학생부교과', '논술', '실기/실적', '기타'];

export interface AdmissionSchedule {
  /** 1단계 합격자 발표 (단계별 전형이 아니면 null) */
  first: DateString | null;
  /** 면접·논술 등 대학별고사 [시작, 종료] */
  exam: [DateString, DateString] | null;
  /** 최초합격자 발표 */
  final: DateString;
  /** 최초합격자 등록 기간. 생략 시 공통 일정 사용 */
  register?: [DateString, DateString] | null;
  /** 충원합격 통보 마감. 생략 시 공통 일정 사용 */
  waitlistEnd?: DateString | null;
  /** 충원 등록 마감. 생략 시 공통 일정 사용 */
  waitlistRegEnd?: DateString | null;
}

export interface HistoryYear {
  /** 학년도 (예: 2026) */
  year: number;
  /** 모집인원 */
  quota: number;
  /** 충원인원 (추가합격 인원) */
  filled: number;
}

export interface Admission {
  id: string;
  univ: string;
  track: string;
  category: Category;
  dept: string;
  /** 올해 모집인원 */
  quota: number;
  schedule: AdmissionSchedule;
  /** 최근 연도부터 최대 3개년 */
  history: HistoryYear[];
  /** true면 화면 예시용 가상 데이터 */
  sample: boolean;
}

export type AdmissionInput = Omit<Admission, 'id' | 'sample'>;

export interface CommonScheduleItem {
  key: string;
  label: string;
  range: [DateString, DateString];
  note?: string;
}

export interface CommonSchedule {
  year: number;
  source: string;
  items: CommonScheduleItem[];
  defaults: {
    register: [DateString, DateString];
    waitlistEnd: DateString;
    waitlistRegEnd: DateString;
  };
}

export type EventKind = 'first' | 'exam' | 'final' | 'register' | 'waitlist' | 'waitlistReg';

export interface TimelineEvent {
  kind: EventKind;
  label: string;
  start: DateString;
  end: DateString;
}

export type Band = '안정' | '적정' | '소신' | '어려움';

export interface Outlook {
  rank: number;
  /** 0~1 */
  probability: number;
  band: Band;
  /** 올해 모집인원 기준으로 환산한 예상 충원인원 */
  expectedFilled: number;
  spread: number;
  /** 예비번호별 확률 곡선 */
  curve: { rank: number; probability: number }[];
  /** 연도별로 그 해 충원인원이었다면 합격했는지 */
  byYear: { year: number; filled: number; scaledFilled: number; rate: number; passed: boolean }[];
}
