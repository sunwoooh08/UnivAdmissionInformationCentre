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
  /** 각 값의 근거가 된 대학 공식 자료 */
  sources: Source[];
  /** 마지막으로 검수·반영된 시각 (ISO) */
  updatedAt: string;
}

/** 출처: 대학이 직접 게시한 모집요강·입시결과 등 */
export interface Source {
  label: string;
  url: string;
  /** 출처를 확인한 날짜 */
  checkedAt: DateString;
}

/** 지원 정보 본문 (식별자·메타 제외) */
export type AdmissionInput = Omit<Admission, 'id' | 'sources' | 'updatedAt'>;

/**
 * 수집기가 보내는 변경. 모집요강 수집기는 일정·모집인원만,
 * 입시결과 수집기는 충원 이력만 채우는 식으로 일부만 담을 수 있다.
 * (대학, 전형, 모집단위)가 같은 기존 항목에 합쳐진다.
 */
export interface AdmissionDraft {
  univ: string;
  track: string;
  dept: string;
  category?: Category;
  quota?: number;
  schedule?: Partial<AdmissionSchedule>;
  history?: HistoryYear[];
  sources: Source[];
}

/** 수집 결과 한 건이 어떻게 처리됐는지 */
export type IngestOutcome = 'created' | 'updated' | 'unchanged' | 'pending' | 'rejected';

export interface IngestLogEntry {
  id: string;
  runId: string;
  collector: string;
  at: string;
  key: string;
  admissionId: string | null;
  outcome: IngestOutcome;
  /** 반영되지 않은 이유 또는 바뀐 항목 요약 */
  messages: string[];
}

export interface IngestSummary {
  runId: string;
  counts: Record<IngestOutcome, number>;
  entries: IngestLogEntry[];
}

export type ReportStatus = 'open' | 'resolved';

/** 이용자 오류 제보 */
export interface Report {
  id: string;
  admissionId: string;
  message: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

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
