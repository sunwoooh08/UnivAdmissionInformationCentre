// 전국 4년제 대학 목록을 공공데이터포털 표준데이터에서 받아 src/registry/universities.json 으로 만든다.
//   출처: 전국대학및전문대학정보표준데이터 (한국대학교육협의회 제공)
//   https://www.data.go.kr/data/15107736/standard.do
// 사용법: node scripts/update-registry.mjs
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PK = '15107736';
const BASE = 'https://www.data.go.kr';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'registry', 'universities.json');

/** 수시 6회 제한 대상인 4년제 */
const KINDS = new Set(['대학교', '교육대학', '산업대학']);
/** 본교와 입학처를 따로 운영하는 분교만 별도 항목으로 둔다 (제2·3캠퍼스는 본교 입학처) */
const BRANCHES = new Set(['본교', '분교']);

const cols = await (await fetch(`${BASE}/download/columList.json?pk=${PK}&ext=JSON`)).json();
const qs = new URLSearchParams();
for (const c of cols.tableVO.colNmList) qs.append('colNmList', c);
qs.set('totalCount', String(cols.totalCount));
qs.set('svcTableNm', cols.tableVO.svcTableNm);
qs.set('perPage', '10000');
qs.set('page', '1');
const rows = await (await fetch(`${BASE}/download/standard.json?publicDataPk=${PK}&${qs}`)).json();
if (!Array.isArray(rows) || rows.length < 100) throw new Error(`예상보다 적은 데이터: ${rows?.length}`);

const candidates = rows.filter(
  (r) => r.UNIV_SE_NM === '대학' && KINDS.has(r.SCHL_SE_NM) && BRANCHES.has(r.MAINBRANCH_NM) && r.HMPG_ADDR?.trim(),
);
// 같은 학교가 '대학교'와 '산업대학'으로 두 번 실린 경우 '대학교' 쪽만 남긴다
const pick = candidates.filter(
  (r) =>
    r.SCHL_SE_NM !== '산업대학' ||
    !candidates.some((o) => o !== r && o.SCHL_SE_NM !== '산업대학' && homepage(o.HMPG_ADDR) === homepage(r.HMPG_ADDR)),
);

function homepage(raw) {
  let s = raw.trim().replace(/\s+/g, '');
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  return `https://${u.host.toLowerCase()}`;
}

/** 도메인으로 영문 ID 를 만든다: www.yonsei.ac.kr → yonsei, sejong.korea.ac.kr → korea-sejong */
function idFor(host) {
  const labels = host.replace(/^www\d?\./, '').split('.');
  const core = labels.filter((l) => !['ac', 'kr', 'com', 'net', 'org', 'edu', 'or', 'go'].includes(l));
  return core.reverse().join('-').toLowerCase();
}

const used = new Map();
const list = pick
  .map((r) => {
    const hp = homepage(r.HMPG_ADDR);
    let id = idFor(new URL(hp).host);
    // 같은 도메인을 쓰는 분교 (예: 한양대 ERICA)
    if (r.MAINBRANCH_NM === '분교' && pick.some((o) => o !== r && o.MAINBRANCH_NM === '본교' && homepage(o.HMPG_ADDR) === hp)) {
      const tag = /\(([^)]+)\)/.exec(r.SCHL_NM)?.[1] ?? 'branch';
      id = `${id}-${tag.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'branch'}`;
    }
    return {
      id,
      name: r.SCHL_NM.trim(),
      kind: r.SCHL_SE_NM,
      branch: r.MAINBRANCH_NM,
      founding: r.FNDN_FORM_SE_NM,
      region: r.CTPV_NM,
      homepage: hp,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

for (const u of list) {
  const n = used.get(u.id) ?? 0;
  used.set(u.id, n + 1);
  if (n > 0) u.id = `${u.id}-${n + 1}`;
}

const out = {
  source: {
    name: '전국대학및전문대학정보표준데이터 (한국대학교육협의회)',
    url: `${BASE}/data/${PK}/standard.do`,
    basedOn: rows[0]?.CRTR_YMD ?? null,
    fetchedAt: new Date().toISOString().slice(0, 10),
  },
  universities: list,
};
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${list.length}개 대학 → ${OUT}`);
