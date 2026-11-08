import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, parseRobots } from './robots.js';

const txt = `
User-agent: *
Disallow: /admin/
Disallow: /*.hwp$
Allow: /admin/public/
Crawl-delay: 5

User-agent: BadBot
Disallow: /
`;

test('robots rules for generic agent', () => {
  const r = parseRobots(txt, 'UAIC-Collector/0.1 (+x)');
  assert.equal(r.crawlDelay, 5);
  assert.equal(isAllowed(r, '/admission/result.pdf'), true);
  assert.equal(isAllowed(r, '/admin/secret'), false);
  assert.equal(isAllowed(r, '/admin/public/a.pdf'), true);
  assert.equal(isAllowed(r, '/files/a.hwp'), false);
  assert.equal(isAllowed(r, '/files/a.hwp?x=1'), true);
});

test('specific agent group wins', () => {
  const r = parseRobots(txt, 'BadBot/1.0');
  assert.equal(isAllowed(r, '/anything'), false);
});

test('empty robots allows everything', () => {
  assert.equal(isAllowed(parseRobots('', 'x'), '/a'), true);
});
