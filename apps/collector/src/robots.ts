/**
 * 최소한의 robots.txt 해석기.
 * 우리 User-Agent 또는 * 그룹의 Allow/Disallow 규칙 중 가장 길게 일치하는 규칙을 따른다.
 */
export interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelay: number | null;
}

export function parseRobots(text: string, agent: string): RobotsRules {
  const groups: { agents: string[]; allow: string[]; disallow: string[]; delay: number | null }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [], delay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'allow' && value) current.allow.push(value);
    else if (field === 'disallow' && value) current.disallow.push(value);
    else if (field === 'crawl-delay' && Number.isFinite(Number(value))) current.delay = Number(value);
  }
  const name = agent.toLowerCase().split('/')[0] ?? '';
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && name.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  return {
    allow: chosen.flatMap((g) => g.allow),
    disallow: chosen.flatMap((g) => g.disallow),
    crawlDelay: chosen.map((g) => g.delay).find((d) => d !== null) ?? null,
  };
}

function toRegex(rule: string): RegExp {
  const anchored = rule.endsWith('$');
  const body = (anchored ? rule.slice(0, -1) : rule)
    .split('*')
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

export function isAllowed(rules: RobotsRules, pathWithQuery: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const [list, allow] of [
    [rules.allow, true],
    [rules.disallow, false],
  ] as const) {
    for (const r of list) {
      if (toRegex(r).test(pathWithQuery) && (!best || r.length > best.len || (r.length === best.len && allow))) {
        best = { len: r.length, allow };
      }
    }
  }
  return best ? best.allow : true;
}
