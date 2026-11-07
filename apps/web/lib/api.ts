import type { Admission, Category, CommonSchedule, Outlook } from '@susi/shared';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    let message = `요청에 실패했습니다 (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) message = Array.isArray(body.message) ? body.message.join('\n') : body.message;
    } catch {
      /* 본문 없음 */
    }
    throw new Error(message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  schedule: () => request<CommonSchedule>('/api/schedule'),
  search: (q: string, category?: Category | '') => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (category) p.set('category', category);
    const qs = p.toString();
    return request<Admission[]>(`/api/admissions${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<Admission>(`/api/admissions/${encodeURIComponent(id)}`),
  outlook: (id: string, rank: number, signal?: AbortSignal) =>
    request<Outlook>(`/api/admissions/${encodeURIComponent(id)}/outlook?rank=${rank}`, { signal }),
  report: (admissionId: string, message: string) =>
    request<{ id: string }>('/api/reports', { method: 'POST', body: JSON.stringify({ admissionId, message }) }),
};
