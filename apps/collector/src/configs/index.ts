import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UniversityConfig } from './types.js';

/**
 * 대학별 수집 설정은 universities/<id>.ts 파일 하나에 하나씩 둔다.
 * 이 폴더의 파일을 모두 불러온다. 파일 하나가 잘못돼도 나머지 대학은 계속 수집한다.
 * 파일이 없는 대학은 '설정 필요(unconfigured)'로 표시된다.
 */
const dir = join(dirname(fileURLToPath(import.meta.url)), 'universities');

export const CONFIGS: UniversityConfig[] = [];
export const CONFIG_ERRORS: { file: string; error: string }[] = [];

for (const file of readdirSync(dir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')).sort()) {
  try {
    const mod = (await import(pathToFileURL(join(dir, file)).href)) as { default?: UniversityConfig };
    const config = mod.default;
    if (!config?.id) throw new Error('default export 가 없거나 id 가 없음');
    if (`${config.id}.js` !== file) throw new Error(`파일 이름과 id(${config.id})가 다름`);
    CONFIGS.push(config);
  } catch (err) {
    CONFIG_ERRORS.push({ file, error: (err as Error).message });
  }
}

export const CONFIG_BY_ID = new Map(CONFIGS.map((c) => [c.id, c]));
