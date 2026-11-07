import type { Admission, Band, HistoryYear, Outlook } from './types.js';

/** 최근 연도부터의 가중치. 데이터가 적으면 앞에서부터 잘라 정규화한다. */
const YEAR_WEIGHTS = [0.5, 0.3, 0.2];

/** 표준정규분포 누적분포함수 (Abramowitz–Stegun 7.1.26 근사) */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export function fillRate(h: HistoryYear): number {
  return h.quota > 0 ? h.filled / h.quota : 0;
}

export function sortHistory(history: HistoryYear[]): HistoryYear[] {
  return [...history].sort((a, b) => b.year - a.year);
}

export function bandOf(p: number): Band {
  if (p >= 0.8) return '안정';
  if (p >= 0.5) return '적정';
  if (p >= 0.2) return '소신';
  return '어려움';
}

/**
 * 올해 모집인원 기준 예상 충원인원 분포(정규 근사)를 추정한다.
 * - 평균: 연도별 충원율의 가중평균 × 올해 모집인원
 * - 퍼짐: 연도별 환산 충원인원의 가중 표준편차. 3개년으로는 변동을 과소평가하기 쉬우므로
 *         평균의 20% 또는 1명 중 큰 값을 하한으로 둔다. 1개년뿐이면 평균의 35%.
 */
export function estimateFilled(quota: number, history: HistoryYear[]): { mean: number; spread: number } | null {
  const hs = sortHistory(history).filter((h) => h.quota > 0).slice(0, YEAR_WEIGHTS.length);
  if (hs.length === 0 || quota <= 0) return null;
  const w = YEAR_WEIGHTS.slice(0, hs.length);
  const wSum = w.reduce((a, b) => a + b, 0);
  const scaled = hs.map((h) => fillRate(h) * quota);
  const mean = scaled.reduce((acc, v, i) => acc + v * (w[i] ?? 0), 0) / wSum;
  if (hs.length === 1) return { mean, spread: Math.max(mean * 0.35, 1.5) };
  const variance = scaled.reduce((acc, v, i) => acc + (w[i] ?? 0) * (v - mean) ** 2, 0) / wSum;
  return { mean, spread: Math.max(Math.sqrt(variance), mean * 0.2, 1) };
}

/** 예비번호 rank가 충원으로 합격할 확률 = P(충원인원 ≥ rank) */
export function passProbability(rank: number, mean: number, spread: number): number {
  if (rank <= 0) return 1;
  const p = 1 - normalCdf((rank - 0.5 - mean) / spread);
  return Math.min(Math.max(p, 0), 1);
}

export function computeOutlook(admission: Pick<Admission, 'quota' | 'history'>, rank: number): Outlook | null {
  const est = estimateFilled(admission.quota, admission.history);
  if (!est) return null;
  const r = Math.max(1, Math.floor(rank));
  const probability = passProbability(r, est.mean, est.spread);
  const maxRank = Math.max(Math.ceil(est.mean + est.spread * 3), r + 5, 10);
  const curve = Array.from({ length: maxRank }, (_, i) => ({
    rank: i + 1,
    probability: passProbability(i + 1, est.mean, est.spread),
  }));
  const byYear = sortHistory(admission.history)
    .filter((h) => h.quota > 0)
    .map((h) => {
      const rate = fillRate(h);
      const scaledFilled = Math.round(rate * admission.quota);
      return { year: h.year, filled: h.filled, scaledFilled, rate, passed: r <= scaledFilled };
    });
  return {
    rank: r,
    probability,
    band: bandOf(probability),
    expectedFilled: est.mean,
    spread: est.spread,
    curve,
    byYear,
  };
}
