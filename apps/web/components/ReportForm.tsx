'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

/** "정보가 틀려요" 제보 */
export function ReportForm({ admissionId }: { admissionId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (state === 'sent') return <p className="small">제보를 받았습니다. 확인 후 반영하겠습니다.</p>;
  if (!open)
    return (
      <button className="text small" onClick={() => setOpen(true)}>
        정보가 틀렸나요? 제보하기
      </button>
    );

  return (
    <form
      className="report"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('sending');
        try {
          await api.report(admissionId, message);
          setState('sent');
        } catch (err) {
          setError((err as Error).message);
          setState('error');
        }
      }}
    >
      <label className="field">
        <span>어떤 값이 어떻게 틀렸는지 적어 주세요 (가능하면 근거 링크도)</span>
        <textarea
          required
          minLength={5}
          maxLength={1000}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" onClick={() => setOpen(false)}>
          취소
        </button>
        <button className="primary" type="submit" disabled={state === 'sending'}>
          보내기
        </button>
      </div>
    </form>
  );
}
