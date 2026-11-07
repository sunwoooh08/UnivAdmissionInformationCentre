import data from './universities.json' with { type: 'json' };

export interface University {
  id: string;
  name: string;
  kind: string;
  branch: string;
  founding: string;
  region: string;
  homepage: string;
}

/** 전국 4년제 대학 목록 (scripts/update-registry.mjs 로 갱신) */
export const UNIVERSITIES: University[] = data.universities;
export const REGISTRY_SOURCE = data.source;
