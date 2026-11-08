'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  admissionEvents,
  CATEGORIES,
  daysUntil,
  formatDate,
  formatDday,
  formatRange,
  nextEvent,
  todayKST,
  type Admission,
  type AdmissionInput,
  type Category,
  type CommonSchedule,
} from '@susi/shared';
import { api } from '@/lib/api';
import { isLocal, loadLocal, loadMine, makeLocal, MAX_APPLICATIONS, saveLocal, saveMine, type MineState } from '@/lib/storage';
import { AdmissionForm } from './AdmissionForm';
import { Detail } from './Detail';
import { Timeline } from './Timeline';

const PAGE_SIZE = 20;

export function Dashboard() {
  const [today] = useState(() => todayKST());
  const [schedule, setSchedule] = useState<CommonSchedule | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [results, setResults] = useState<Admission[]>([]);
  const [searching, setSearching] = useState(false);
  const [mine, setMine] = useState<MineState>({ ids: [], ranks: {} });
  const [cache, setCache] = useState<Record<string, Admission>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: 'create' } | { mode: 'edit'; admission: Admission } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [local, setLocal] = useState<Admission[]>([]);
  const [stats, setStats] = useState<{ universities: number; admissions: number } | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const updateMine = useCallback((fn: (m: MineState) => MineState) => {
    setMine((prev) => {
      const next = fn(prev);
      saveMine(next);
      return next;
    });
  }, []);

  // 첫 로드: 공통 일정 + 저장된 내 지원 목록
  useEffect(() => {
    api.schedule().then(setSchedule).catch((e: Error) => setLoadError(e.message));
    api.stats().then(setStats).catch(() => undefined);
    const saved = loadMine();
    const mineLocal = loadLocal();
    setLocal(mineLocal);
    setMine(saved);
    setSelectedId(saved.ids[0] ?? null);
    const localById = new Map(mineLocal.map((a) => [a.id, a]));
    Promise.all(
      saved.ids.map((id) => (id.startsWith('local-') ? Promise.resolve(localById.get(id) ?? null) : api.get(id).catch(() => null))),
    ).then((list) => {
      const found = list.filter((a): a is Admission => a !== null);
      setCache((c) => ({ ...c, ...Object.fromEntries(found.map((a) => [a.id, a])) }));
      if (found.length !== saved.ids.length) {
        const ok = new Set(found.map((a) => a.id));
        updateMine((m) => ({ ...m, ids: m.ids.filter((id) => ok.has(id)) }));
      }
    });
  }, [updateMine]);

  // 검색 (입력 후 잠시 멈추면 요청)
  useEffect(() => {
    setVisible(PAGE_SIZE);
    if (!query.trim() && !category) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .search(query, category)
        .then((list) => {
          setResults(list);
          setCache((c) => ({ ...c, ...Object.fromEntries(list.map((a) => [a.id, a])) }));
        })
        .catch((e: Error) => setLoadError(e.message))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, category]);

  // 내가 입력한 항목도 검색 결과에 함께 보여준다
  const localMatches = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return local.filter(
      (a) =>
        (!category || a.category === category) &&
        terms.every((t) => `${a.univ} ${a.track} ${a.category} ${a.dept}`.toLowerCase().includes(t)),
    );
  }, [local, query, category]);
  const shown = useMemo(() => [...localMatches, ...results], [localMatches, results]);

  const myAdmissions = useMemo(
    () => mine.ids.map((id) => cache[id]).filter((a): a is Admission => Boolean(a)),
    [mine.ids, cache],
  );
  const selected = selectedId ? cache[selectedId] : undefined;
  const full = mine.ids.length >= MAX_APPLICATIONS;

  function add(id: string) {
    if (mine.ids.includes(id) || full) return;
    updateMine((m) => ({ ...m, ids: [...m.ids, id] }));
    setSelectedId(id);
  }

  function remove(id: string) {
    updateMine((m) => {
      const ranks = { ...m.ranks };
      delete ranks[id];
      return { ids: m.ids.filter((x) => x !== id), ranks };
    });
    if (selectedId === id) setSelectedId(mine.ids.find((x) => x !== id) ?? null);
  }

  function storeLocal(next: Admission[]) {
    setLocal(next);
    saveLocal(next);
    setCache((c) => ({ ...c, ...Object.fromEntries(next.map((a) => [a.id, a])) }));
  }

  async function submitForm(input: AdmissionInput) {
    if (form?.mode === 'edit') {
      const saved = makeLocal(input, form.admission.id);
      storeLocal(local.map((a) => (a.id === saved.id ? saved : a)));
    } else {
      const saved = makeLocal(input);
      storeLocal([saved, ...local]);
      if (!full) add(saved.id);
    }
    setForm(null);
  }

  async function deleteEdited() {
    if (form?.mode !== 'edit') return;
    if (!window.confirm('이 항목을 삭제할까요?')) return;
    const id = form.admission.id;
    remove(id);
    storeLocal(local.filter((a) => a.id !== id));
    setForm(null);
  }

  return (
    <>
      <header className="site">
        <div className="wrap">
          <h1>수시 지원 현황</h1>
          <span className="today">오늘 {formatDate(today, true)}</span>
        </div>
      </header>

      <main className="wrap">
        {loadError && <p className="error">서버에 연결하지 못했습니다: {loadError}</p>}

        <section>
          <h2>모집단위 검색</h2>
          <p className="lead">대학, 전형, 학과 이름으로 찾아서 내 지원에 추가하세요. 최대 {MAX_APPLICATIONS}개까지 담을 수 있습니다.</p>
          <div className="row">
            <input
              className="grow"
              type="search"
              placeholder="예: 한빛 경영, 컴퓨터공학"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="검색어"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value as Category | '')} aria-label="전형 유형">
              <option value="">전체 전형</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button onClick={() => setForm({ mode: 'create' })}>직접 추가</button>
          </div>

          <div className="table-scroll" style={{ marginTop: 12 }}>
            {shown.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>대학 · 학과</th>
                    <th className="hide-sm">전형</th>
                    <th className="num hide-sm">모집</th>
                    <th>최초합격 발표</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, visible).map((a) => {
                    const added = mine.ids.includes(a.id);
                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="title">
                            {a.univ} {a.dept}
                          </div>
                          <div className="sub">
                            <span className="show-sm">{a.track} · </span>
                            {isLocal(a) ? '내가 입력' : a.quota ? `모집 ${a.quota}명` : '모집인원 확인 중'}
                          </div>
                        </td>
                        <td className="hide-sm">{a.track}</td>
                        <td className="num hide-sm">{a.quota ?? '–'}</td>
                        <td className="nowrap">
                          {a.schedule.final ? formatDate(a.schedule.final) : <span className="muted">확인 중</span>}
                        </td>
                        <td className="actions">
                          <button onClick={() => (added ? setSelectedId(a.id) : add(a.id))} disabled={!added && full}>
                            {added ? '보기' : '추가'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {shown.length > visible && (
              <p>
                <button onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  더 보기 ({visible} / {shown.length}
                  {results.length >= 100 ? '+' : ''})
                </button>
              </p>
            )}
            {!searching && shown.length === 0 && (
              <p className="empty">
                {query || category
                  ? '검색 결과가 없습니다.'
                  : stats && stats.admissions > 0
                    ? `대학 ${stats.universities}곳, 모집단위 ${stats.admissions.toLocaleString()}개의 충원 자료가 있습니다. 대학이나 학과 이름으로 검색하세요.`
                    : '아직 수집된 대학이 없습니다.'}{' '}
                찾는 대학이 없으면 &lsquo;직접 추가&rsquo;로 입력하세요. 직접 입력한 정보는 이 브라우저에만 저장됩니다.
              </p>
            )}
          </div>
        </section>

        {form && (
          <section>
            <h2>{form.mode === 'edit' ? '지원 정보 수정' : '지원 정보 직접 추가'}</h2>
            <p className="lead">
              모집요강과 대학 입학처의 전년도 입시결과를 보고 입력하세요. 입력한 정보는 이 브라우저에만 저장되고 다른 사람에게는
              보이지 않습니다.
            </p>
            <AdmissionForm
              key={form.mode === 'edit' ? form.admission.id : 'new'}
              initial={form.mode === 'edit' ? form.admission : undefined}
              onSubmit={submitForm}
              onCancel={() => setForm(null)}
              onDelete={form.mode === 'edit' ? deleteEdited : undefined}
            />
          </section>
        )}

        <section>
          <h2>
            내 지원 <span className="muted">{mine.ids.length}/{MAX_APPLICATIONS}</span>
          </h2>
          {myAdmissions.length === 0 ? (
            <p className="empty">아직 추가한 지원이 없습니다. 위에서 검색해 추가하세요.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="hide-sm">#</th>
                    <th>대학 · 학과</th>
                    <th>다음 일정</th>
                    <th className="num">남은 날</th>
                    <th className="num hide-sm">예비번호</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {myAdmissions.map((a, i) => {
                    const ev = schedule ? nextEvent(admissionEvents(a, schedule), today) : null;
                    const d = ev ? daysUntil(ev.start, today) : null;
                    return (
                      <tr
                        key={a.id}
                        className={`clickable${a.id === selectedId ? ' selected' : ''}`}
                        onClick={() => setSelectedId(a.id)}
                      >
                        <td className="hide-sm">{i + 1}</td>
                        <td>
                          <div className="title">
                            {a.univ} {a.dept}
                          </div>
                          <div className="sub">{a.track}</div>
                        </td>
                        <td>
                          {ev ? (
                            <>
                              {ev.label}
                              <div className="sub">{formatRange(ev.start, ev.end)}</div>
                            </>
                          ) : (
                            <span className="muted">일정 종료</span>
                          )}
                        </td>
                        <td className="num">
                          {d !== null && (
                            <span className={`dday${d <= 3 ? ' near' : ''}`}>{d <= 0 ? '진행 중' : formatDday(d)}</span>
                          )}
                        </td>
                        <td className="num hide-sm">{mine.ranks[a.id] ?? '–'}</td>
                        <td className="actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(a.id);
                            }}
                          >
                            빼기
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {schedule && myAdmissions.length > 0 && (
            <>
              <h3>일정 한눈에 보기</h3>
              <Timeline
                rows={myAdmissions.map((a) => ({ admission: a, events: admissionEvents(a, schedule) }))}
                today={today}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </>
          )}
        </section>

        {selected && schedule && (
          <Detail
            admission={selected}
            schedule={schedule}
            today={today}
            rank={mine.ranks[selected.id]}
            onRankChange={(rank) =>
              updateMine((m) => {
                const ranks = { ...m.ranks };
                if (rank) ranks[selected.id] = rank;
                else delete ranks[selected.id];
                return { ...m, ranks };
              })
            }
            onEdit={isLocal(selected) ? () => setForm({ mode: 'edit', admission: selected }) : undefined}
          />
        )}

        {schedule && (
          <section>
            <h2>{schedule.year}학년도 수시 공통 일정</h2>
            <p className="lead">출처: {schedule.source}</p>
            <div className="table-scroll">
              <table>
                <tbody>
                  {schedule.items.map((it) => {
                    const d = daysUntil(it.range[1], today);
                    return (
                      <tr key={it.key} className={d < 0 ? 'past' : undefined}>
                        <td>
                          {it.label}
                          {it.note && <div className="sub">{it.note}</div>}
                        </td>
                        <td className="nowrap">{formatRange(it.range[0], it.range[1])}</td>
                        <td className="num">
                          <span className={`dday${d < 0 ? ' past' : ''}`}>
                            {d < 0 ? '종료' : daysUntil(it.range[0], today) < 0 ? '진행 중' : formatDday(daysUntil(it.range[0], today))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
