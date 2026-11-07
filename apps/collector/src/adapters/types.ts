import type { AdmissionDraft } from '@susi/shared';
import type { PoliteFetcher } from '../http.js';

export interface AdapterContext {
  fetcher: PoliteFetcher;
  pdfToText: (pdf: Buffer, opts?: { layout?: boolean; firstPage?: number; lastPage?: number }) => Promise<string>;
  /** 오늘 날짜 (KST, YYYY-MM-DD) — 출처 확인일로 쓴다 */
  today: string;
  log: (msg: string) => void;
}

/**
 * 대학별 수집기. 대학이 직접 게시한 자료(모집요강, 입시결과)만 읽는다.
 * 일부 값만 채워도 된다 — 같은 (대학, 전형, 모집단위)끼리 서버에서 합쳐진다.
 */
export interface Adapter {
  /** 소문자 영문 ID (예: yonsei-results) */
  id: string;
  univ: string;
  description: string;
  run(ctx: AdapterContext): Promise<AdmissionDraft[]>;
}
