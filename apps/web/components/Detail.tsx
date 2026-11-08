'use client';

import { useEffect, useState } from 'react';
import {
  admissionEvents,
  computeOutlook,
  daysUntil,
  formatDate,
  fillRate,
  formatDday,
  formatRange,
  scaledFilled,
  sortHistory,
  type Admission,
  type CommonSchedule,
  type Outlook,
} from '@susi/shared';
import { api } from '@/lib/api';
import { isLocal } from '@/lib/storage';
import { ReportForm } from './ReportForm';
import { HistoryChart } from './HistoryChart';
import { OutlookChart } from './OutlookChart';

export function Detail({ admission, schedule, today, rank, onRankChange, onEdit }: {
  admission: Admission;
  schedule: CommonSchedule;
  today: string;
  rank: number | undefined;
  onRankChange: (rank: number | undefined) => void;
  onEdit?: () => void;
}) {
  const events = admissionEvents(admission, schedule);
  const [outlook, setOutlook] = useState<Outlook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState(rank ? String(rank) : '');

  useEffect(() => setInput(rank ? String(rank) : ''), [admission.id, rank]);

  useEffect(() => {
    if (!rank) {
      setOutlook(null);
      return;
    }
    // 내가 입력한 항목은 서버에 없으므로 브라우저에서 계산한다
    if (isLocal(admission)) {
      setOutlook(computeOutlook(admission, rank));
      setError(admission.history.length ? null : '충원 이력을 입력하면 계산할 수 있습니다.');
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      api
        .outlook(admission.id, rank, ctrl.signal)
        .then((o) => {
          setOutlook(o);
          setError(null);
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') {
            setOutlook(null);
            setError(e.message);
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [admission, rank]);

  const history = sortHistory(admission.history);

  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2>
            {admission.univ} {admission.dept}
          </h2>
          <p className="lead">
            {admission.track} · {admission.quota ? `올해 모집 ${admission.quota}명` : '올해 모집인원 확인 중'}
            {isLocal(admission) ? ' · 내가 입력한 정보' : ''}
          </p>
        </div>
        {onEdit && (
          <button className="text" onClick={onEdit}>
            수정
          </button>
        )}
      </div>

      <h3>일정</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>구분</th>
              <th>날짜</th>
              <th className="num">남은 날</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const d = daysUntil(e.end, today);
              const startD = daysUntil(e.start, today);
              return (
                <tr key={e.kind} className={d < 0 ? 'past' : undefined}>
                  <td>{e.label}</td>
                  <td className="nowrap">{formatRange(e.start, e.end)}</td>
                  <td className="num">
                    <span className={`dday${d < 0 ? ' past' : startD <= 3 ? ' near' : ''}`}>
                      {d < 0 ? '종료' : startD <= 0 ? '진행 중' : formatDday(startD)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        {admission.schedule.final ? '' : '최초합격 발표일은 아직 모집요강에서 확인하지 못했습니다. '}
        등록·충원 일정은 대학별 값이 없으면 대교협 공통 일정으로 표시합니다.
      </p>

      <div className="cols">
        <div>
          <h3>최근 3개년 충원</h3>
          <HistoryChart history={admission.history} />
          {history.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>학년도</th>
                    <th className="num">모집</th>
                    <th className="num">충원</th>
                    <th className="num">충원율</th>
                    <th className="num">올해 환산</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.year}>
                      <td>{h.year}</td>
                      <td className="num">{h.quota ?? <span className="muted">미공개</span>}</td>
                      <td className="num">{h.filled}</td>
                      <td className="num">{rateText(fillRate(h))}</td>
                      <td className="num">{Math.round(scaledFilled(h, admission.quota))}명</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3>내 예비번호로 보기</h3>
          <div className="row">
            <label htmlFor="rank">예비번호</label>
            <input
              id="rank"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="예: 12"
              style={{ width: 110 }}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const n = Number(e.target.value);
                onRankChange(Number.isInteger(n) && n > 0 ? n : undefined);
              }}
            />
            {rank && (
              <button className="text" onClick={() => onRankChange(undefined)}>
                지우기
              </button>
            )}
          </div>

          {!rank && <p className="empty">예비번호를 입력하면 지난 3년 충원 규모를 기준으로 합격 가능성을 계산합니다.</p>}
          {error && <p className="error">{error}</p>}
          {rank && outlook && (
            <>
              <div className="figure">
                <span className="big">{Math.round(outlook.probability * 100)}%</span>
                <span className="band">{outlook.band}</span>
                <span className="small muted">
                  예상 충원 약 {Math.round(outlook.expectedFilled)}명 (±{Math.round(outlook.spread)})
                </span>
              </div>
              <div className="meter" aria-hidden>
                <div className="fill" style={{ width: `${outlook.probability * 100}%` }} />
                {[20, 50, 80].map((t) => (
                  <div key={t} className="tick" style={{ left: `${t}%` }} />
                ))}
              </div>
              <div className="meter-scale" aria-hidden>
                <span style={{ left: '10%' }}>어려움</span>
                <span style={{ left: '35%' }}>소신</span>
                <span style={{ left: '65%' }}>적정</span>
                <span style={{ left: '90%' }}>안정</span>
              </div>
              <OutlookChart outlook={outlook} />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>그 해 충원 규모였다면</th>
                      <th className="num">올해 환산 충원</th>
                      <th className="num">{outlook.rank}번</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outlook.byYear.map((y) => (
                      <tr key={y.year}>
                        <td>{y.year}학년도 (충원 {y.filled}명)</td>
                        <td className="num">{y.scaledFilled}명</td>
                        <td className="num">
                          <span className={y.passed ? 'yes' : 'no'}>{y.passed ? '합격권' : '밖'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <details>
            <summary>계산 방법</summary>
            <p>
              연도별 충원율(충원인원 ÷ 모집인원)에 올해 모집인원을 곱해 올해 기준 충원인원으로 환산하고(모집인원이 공개되지
              않은 해는 충원인원을 그대로 씁니다), 최근 연도에 더
              큰 가중치(50·30·20%)를 둬 평균을 냅니다. 연도별 차이로 퍼짐을 추정하되, 3개년만으로는 변동을 작게 보기
              쉬워 평균의 20% 이상으로 둡니다.
            </p>
            <p>
              확률은 &lsquo;올해 충원인원이 내 예비번호 이상일 가능성&rsquo;입니다. 80% 이상 안정, 50% 이상 적정, 20%
              이상 소신, 그 아래는 어려움으로 표시합니다. 복수 합격자 이동, 모집인원 변경, 수능 최저 충족률에 따라 실제
              결과는 크게 달라질 수 있습니다.
            </p>
          </details>
        </div>
      </div>

      {!isLocal(admission) && (
        <>
          <h3>출처</h3>
          <ul className="sources">
            {admission.sources.map((src) => (
              <li key={src.url}>
                <a href={src.url} target="_blank" rel="noopener noreferrer">
                  {src.label}
                </a>{' '}
                <span className="muted small">확인 {formatDate(src.checkedAt)}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            대학이 게시한 자료에서 자동으로 수집해 정해진 규칙으로 검증한 뒤 반영한 값입니다. 최종 확인은 출처 원문으로 하세요.
          </p>
          <ReportForm admissionId={admission.id} />
        </>
      )}
    </section>
  );
}

function rateText(rate: number | null): string {
  return rate === null ? '–' : `${Math.round(rate * 100)}%`;
}
