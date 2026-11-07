'use client';

import { useState } from 'react';
import { CATEGORIES, type Admission, type AdmissionInput, type Category } from '@susi/shared';

interface FormState {
  univ: string;
  track: string;
  category: Category;
  dept: string;
  quota: string;
  first: string;
  examStart: string;
  examEnd: string;
  final: string;
  registerStart: string;
  registerEnd: string;
  waitlistEnd: string;
  history: { year: string; quota: string; filled: string }[];
}

const YEARS = [2026, 2025, 2024];

function toState(a?: Admission): FormState {
  const s = a?.schedule;
  return {
    univ: a?.univ ?? '',
    track: a?.track ?? '',
    category: a?.category ?? '학생부종합',
    dept: a?.dept ?? '',
    quota: a ? String(a.quota) : '',
    first: s?.first ?? '',
    examStart: s?.exam?.[0]?.slice(0, 10) ?? '',
    examEnd: s?.exam?.[1]?.slice(0, 10) ?? '',
    final: s?.final?.slice(0, 10) ?? '',
    registerStart: s?.register?.[0]?.slice(0, 10) ?? '',
    registerEnd: s?.register?.[1]?.slice(0, 10) ?? '',
    waitlistEnd: s?.waitlistEnd?.slice(0, 10) ?? '',
    history: YEARS.map((year) => {
      const h = a?.history.find((x) => x.year === year);
      return { year: String(year), quota: h ? String(h.quota) : '', filled: h ? String(h.filled) : '' };
    }),
  };
}

function toInput(f: FormState): AdmissionInput {
  return {
    univ: f.univ,
    track: f.track,
    category: f.category,
    dept: f.dept,
    quota: Number(f.quota),
    schedule: {
      first: f.first || null,
      exam: f.examStart ? [f.examStart, f.examEnd || f.examStart] : null,
      final: f.final,
      register: f.registerStart ? [f.registerStart, f.registerEnd || f.registerStart] : null,
      waitlistEnd: f.waitlistEnd || null,
    },
    history: f.history
      .filter((h) => h.quota !== '' && h.filled !== '')
      .map((h) => ({ year: Number(h.year), quota: Number(h.quota), filled: Number(h.filled) })),
  };
}

export function AdmissionForm({ initial, onSubmit, onCancel, onDelete }: {
  initial?: Admission;
  onSubmit: (input: AdmissionInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [f, setF] = useState<FormState>(() => toState(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((prev) => ({ ...prev, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(toInput(f));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label="대학" span2>
          <input required value={f.univ} onChange={(e) => set('univ', e.target.value)} placeholder="OO대학교" />
        </Field>
        <Field label="모집단위(학과)" span2>
          <input required value={f.dept} onChange={(e) => set('dept', e.target.value)} placeholder="OO학과" />
        </Field>
        <Field label="전형명" span2>
          <input required value={f.track} onChange={(e) => set('track', e.target.value)} placeholder="학생부종합 (OO형)" />
        </Field>
        <Field label="전형 유형">
          <select value={f.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="올해 모집인원">
          <input required type="number" min={1} value={f.quota} onChange={(e) => set('quota', e.target.value)} />
        </Field>

        <Field label="1단계 발표 (없으면 비움)">
          <input type="date" value={f.first} onChange={(e) => set('first', e.target.value)} />
        </Field>
        <Field label="면접·고사 시작">
          <input type="date" value={f.examStart} onChange={(e) => set('examStart', e.target.value)} />
        </Field>
        <Field label="면접·고사 종료">
          <input type="date" value={f.examEnd} onChange={(e) => set('examEnd', e.target.value)} />
        </Field>
        <Field label="최초합격 발표">
          <input required type="date" value={f.final} onChange={(e) => set('final', e.target.value)} />
        </Field>

        <Field label="등록 시작 (비우면 공통 일정)">
          <input type="date" value={f.registerStart} onChange={(e) => set('registerStart', e.target.value)} />
        </Field>
        <Field label="등록 종료">
          <input type="date" value={f.registerEnd} onChange={(e) => set('registerEnd', e.target.value)} />
        </Field>
        <Field label="충원 통보 마감 (비우면 공통 일정)" span2>
          <input type="date" value={f.waitlistEnd} onChange={(e) => set('waitlistEnd', e.target.value)} />
        </Field>
      </div>

      <h3>최근 3개년 충원 (어디가·대학 입학처 입결 자료)</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>학년도</th>
              <th>모집인원</th>
              <th>충원인원</th>
            </tr>
          </thead>
          <tbody>
            {f.history.map((h, i) => (
              <tr key={h.year}>
                <td>{h.year}</td>
                {(['quota', 'filled'] as const).map((k) => (
                  <td key={k}>
                    <input
                      type="number"
                      min={k === 'quota' ? 1 : 0}
                      value={h[k]}
                      style={{ width: '100%', maxWidth: 140 }}
                      onChange={(e) =>
                        set(
                          'history',
                          f.history.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)),
                        )
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="error" style={{ whiteSpace: 'pre-line' }}>{error}</p>}
      <div className="form-actions">
        {onDelete && (
          <button type="button" style={{ marginRight: 'auto' }} disabled={busy} onClick={() => void onDelete()}>
            삭제
          </button>
        )}
        <button type="button" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {initial ? '저장' : '추가하고 내 지원에 넣기'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`field${span2 ? ' span2' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
