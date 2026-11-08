import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cells, htmlTable, num } from './text.js';

test('num parses counts', () => {
  assert.equal(num('1,234'), 1234);
  assert.equal(num(' 12명 '), 12);
  assert.equal(num('-'), null);
});

test('cells split on wide gaps', () => {
  assert.deepEqual(cells('  경영학과     20      31   155.0 '), ['경영학과', '20', '31', '155.0']);
});

test('htmlTable expands rowspan and colspan', () => {
  const t = htmlTable(`<table>
    <tr><th rowspan="2">전형</th><th colspan="2">2026</th></tr>
    <tr><th>모집</th><th>충원</th></tr>
    <tr><td>종합</td><td>20</td><td>31</td></tr>
  </table>`);
  assert.deepEqual(t, [
    ['전형', '2026', '2026'],
    ['전형', '모집', '충원'],
    ['종합', '20', '31'],
  ]);
});
