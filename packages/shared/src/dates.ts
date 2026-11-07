import type { Admission, CommonSchedule, DateString, TimelineEvent } from './types.js';

const DAY = 86_400_000;

/** "YYYY-MM-DD[THH:mm]" → 해당 날짜의 일 번호 (시각 무시) */
export function dayNumber(date: DateString): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / DAY);
}

export function todayKST(now: Date = new Date()): DateString {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 오늘 기준 남은 일수. 오늘이면 0, 지났으면 음수 */
export function daysUntil(date: DateString, today: DateString): number {
  return dayNumber(date) - dayNumber(today);
}

export function formatDday(days: number): string {
  if (days === 0) return 'D-DAY';
  return days > 0 ? `D-${days}` : `D+${-days}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDate(date: DateString, withYear = false): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay()];
  const time = date.length > 10 ? ` ${date.slice(11, 16)}` : '';
  return `${withYear ? `${y}. ` : ''}${m}. ${d}.(${wd})${time}`;
}

export function formatRange(start: DateString, end: DateString): string {
  if (start === end) return formatDate(start);
  if (start.slice(0, 10) === end.slice(0, 10)) return `${formatDate(start)}–${end.slice(11, 16)}`;
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

export const EVENT_LABELS: Record<TimelineEvent['kind'], string> = {
  first: '1단계 발표',
  exam: '면접·대학별고사',
  final: '최초합격 발표',
  register: '최초합격 등록',
  waitlist: '충원합격 통보',
  waitlistReg: '충원 등록 마감',
};

/** 지원 건의 주요 일정을 시간순으로 정리. 비어 있는 등록·충원 일정은 공통 일정으로 채운다. */
export function admissionEvents(a: Admission, common: CommonSchedule): TimelineEvent[] {
  const s = a.schedule;
  const def = common.defaults;
  const register = s.register ?? def.register;
  const waitlistEnd = s.waitlistEnd ?? def.waitlistEnd;
  const waitlistRegEnd = s.waitlistRegEnd ?? def.waitlistRegEnd;
  // 충원 통보는 최초합격자 등록 마감 다음 날부터 시작
  const waitlistStart = new Date((dayNumber(register[1]) + 1) * DAY).toISOString().slice(0, 10);

  const events: TimelineEvent[] = [];
  if (s.first) events.push({ kind: 'first', label: EVENT_LABELS.first, start: s.first, end: s.first });
  if (s.exam) events.push({ kind: 'exam', label: EVENT_LABELS.exam, start: s.exam[0], end: s.exam[1] });
  events.push({ kind: 'final', label: EVENT_LABELS.final, start: s.final, end: s.final });
  events.push({ kind: 'register', label: EVENT_LABELS.register, start: register[0], end: register[1] });
  events.push({ kind: 'waitlist', label: EVENT_LABELS.waitlist, start: waitlistStart, end: waitlistEnd });
  events.push({ kind: 'waitlistReg', label: EVENT_LABELS.waitlistReg, start: waitlistRegEnd, end: waitlistRegEnd });
  return events.sort((x, y) => dayNumber(x.start) - dayNumber(y.start));
}

/** 오늘 이후(오늘 포함)로 끝나지 않은 첫 일정 */
export function nextEvent(events: TimelineEvent[], today: DateString): TimelineEvent | null {
  return events.find((e) => daysUntil(e.end, today) >= 0) ?? null;
}
