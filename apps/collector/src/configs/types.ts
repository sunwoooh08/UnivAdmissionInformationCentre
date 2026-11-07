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

export interface UniversityConfig {
  /** registry/universities.json 의 id */
  id: string;
  status: ConfigStatus;
  /** 상태에 대한 설명 (어드민에 표시) */
  note?: string;
  /** 입학처 주소 (확인된 경우) */
  admissionSite?: string;
  results?: ResultsSource[];
}
