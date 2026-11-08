import type { AdmissionSchedule, Category } from '@susi/shared';
import type { PositionedMatrixSpec } from '../extract/positioned.js';
import type { ResultsSpec } from '../extract/results.js';

/**
 * 대학별 수집 상태 (설정 기준)
 *  - active            설정대로 수집
 *  - robots-blocked    대학이 robots.txt 로 자동 수집을 금지 → 허락을 받기 전에는 수집하지 않음
 *  - restricted        자료에 이용 제한 문구가 있음 → 확인 전에는 수집하지 않음
 *  - no-official-data  대학이 학과별 결과 표를 게시하지 않음
 *  - needs-ocr         결과가 이미지로만 게시됨 (글자 인식 필요)
 *  - unconfigured      아직 자료 위치·형식을 확인하지 못함
 */
export type ConfigStatus = 'active' | 'robots-blocked' | 'restricted' | 'no-official-data' | 'needs-ocr' | 'unconfigured';

/** 입시결과 파일 (지난 학년도 모집인원·충원) */
export interface ResultsSource {
  /** 화면에 출처로 보일 이름 */
  label: string;
  /** 대학이 게시한 파일 주소 */
  url: string;
  format: 'pdf';
  /** 이 파일에 기대하는 학년도 (검증용) */
  years: number[];
  spec: ResultsSpec;
}

/** 모집요강에서 확인한 전형 일정. 날짜는 YYYY-MM-DD 또는 YYYY-MM-DDTHH:mm */
export interface TrackSchedule {
  /** 전형명 (입시결과·모집인원 표와 같은 이름) */
  track: string;
  category?: Category;
  first?: AdmissionSchedule['first'];
  exam?: AdmissionSchedule['exam'];
  final?: AdmissionSchedule['final'];
  register?: AdmissionSchedule['register'];
  waitlistEnd?: AdmissionSchedule['waitlistEnd'];
  waitlistRegEnd?: AdmissionSchedule['waitlistRegEnd'];
}

/** 올해 모집요강 */
export interface GuideSource {
  label: string;
  url: string;
  format: 'pdf';
  /** 올해 모집인원 표 (행 패턴의 quotaNow 그룹, 또는 matrix + m0, m1 …) */
  quotas?: ResultsSpec[];
  /** 빈 칸이 있는 행렬 모집인원 표를 PDF 좌표로 읽기 (합계 열 검사) */
  positionedQuotas?: PositionedMatrixSpec[];
  /** 전형별 일정. 이 전형에 속한 모집단위 전체에 적용된다 */
  schedules?: TrackSchedule[];
}

export interface UniversityConfig {
  /** registry/universities.json 의 id (파일 이름과 같아야 함) */
  id: string;
  status: ConfigStatus;
  /** 상태에 대한 설명 (어드민에 표시) */
  note?: string;
  /** 입학처 주소 (확인된 경우) */
  admissionSite?: string;
  results?: ResultsSource[];
  guide?: GuideSource;
  /** 자료마다 다른 전형명을 하나로 맞춤 (원래 이름 → 쓸 이름) */
  trackAliases?: Record<string, string>;
  /** 자료마다 다른 모집단위명을 하나로 맞춤 (원래 이름 → 쓸 이름) */
  deptAliases?: Record<string, string>;
}
