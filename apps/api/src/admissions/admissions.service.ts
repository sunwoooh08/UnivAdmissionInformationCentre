import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { computeOutlook, type Admission, type AdmissionInput, type Category } from '@susi/shared';
import { SAMPLE_ADMISSIONS } from './seed.js';

/**
 * 예시 데이터(읽기 전용) + 사용자가 추가한 항목(JSON 파일에 저장).
 * 저장 위치는 DATA_DIR 환경변수 (기본: 실행 위치의 ./data).
 */
@Injectable()
export class AdmissionsService implements OnModuleInit {
  private readonly logger = new Logger(AdmissionsService.name);
  private readonly file = join(process.env.DATA_DIR ?? join(process.cwd(), 'data'), 'admissions.json');
  private custom: Admission[] = [];
  private writing: Promise<void> = Promise.resolve();

  async onModuleInit() {
    try {
      const raw = await readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as Admission[];
      this.custom = Array.isArray(parsed) ? parsed.map((a) => ({ ...a, sample: false })) : [];
      this.logger.log(`Loaded ${this.custom.length} saved admissions from ${this.file}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  all(): Admission[] {
    return [...this.custom, ...SAMPLE_ADMISSIONS];
  }

  search(q?: string, category?: Category): Admission[] {
    const terms = (q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    return this.all().filter((a) => {
      if (category && a.category !== category) return false;
      const hay = `${a.univ} ${a.track} ${a.category} ${a.dept}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  get(id: string): Admission {
    const found = this.all().find((a) => a.id === id);
    if (!found) throw new NotFoundException('해당 지원 정보를 찾을 수 없습니다.');
    return found;
  }

  async create(input: AdmissionInput): Promise<Admission> {
    const admission: Admission = { ...normalize(input), id: randomUUID(), sample: false };
    this.custom.unshift(admission);
    await this.persist();
    return admission;
  }

  async update(id: string, input: AdmissionInput): Promise<Admission> {
    const idx = this.custom.findIndex((a) => a.id === id);
    if (idx < 0) throw new NotFoundException('예시 데이터는 수정할 수 없습니다. 직접 추가한 항목만 수정됩니다.');
    const updated: Admission = { ...normalize(input), id, sample: false };
    this.custom[idx] = updated;
    await this.persist();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const before = this.custom.length;
    this.custom = this.custom.filter((a) => a.id !== id);
    if (this.custom.length === before) throw new NotFoundException('직접 추가한 항목만 삭제할 수 있습니다.');
    await this.persist();
  }

  outlook(id: string, rank: number) {
    const a = this.get(id);
    return computeOutlook(a, rank);
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.custom, null, 2);
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, snapshot, 'utf8');
      await rename(tmp, this.file);
    });
    return this.writing;
  }
}

function normalize(input: AdmissionInput): AdmissionInput {
  const s = input.schedule;
  return {
    univ: input.univ.trim(),
    track: input.track.trim(),
    category: input.category,
    dept: input.dept.trim(),
    quota: input.quota,
    schedule: {
      first: s.first || null,
      exam: s.exam ?? null,
      final: s.final,
      register: s.register ?? null,
      waitlistEnd: s.waitlistEnd || null,
      waitlistRegEnd: s.waitlistRegEnd || null,
    },
    history: [...input.history].sort((a, b) => b.year - a.year).slice(0, 3),
  };
}
