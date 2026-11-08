import type { UniversityConfig } from '../types.js';

const config: UniversityConfig = {
  id: 'sookmyung',
  status: 'active',
  admissionSite: 'https://admission.sookmyung.ac.kr',
  results: [
    ['지역균형선발전형', 'crosseditor_4.6.0.23/binary/files/000002', '_1'],
    ['논술우수자전형', 'crosseditor_4.6.0.23/binary/files/000002', '_1'],
    ['숙명인재면접형_소프트웨어인재전형', 'crosseditor_4.6.0.23/binary/files/000002', '_6'],
    ['정원외전형', 'crosseditor_4.6.0.23/binary/files/000002', '_1'],
    ['예능창의인재전형', 'crosseditor_4.6.1.04/binary/files/000001', '_0723'],
  ].map(([name, dir, suffix]) => ({
    label: `숙명여자대학교 2026학년도 수시모집 전형 결과 (${(name ?? '').replace(/_/g, '·')})`,
    url: `https://admission.sookmyung.ac.kr/${dir}/${encodeURIComponent(`2026학년도_수시모집_전형_결과_${name}${suffix}.pdf`)}`,
    format: 'pdf' as const,
    years: [2026],
    spec: {
      // ◇ [학생부교과] 지역균형선발전형
      section: /◇\s*\[(?<category>[^\]]+)\]\s*(?<track>\S.*?)\s*$/g,
      // 모집인원 지원인원 경쟁률 충원인원 전체합격인원 …
      rows: [{ pattern: /^(?<quota2026>\d+) [\d,]+ [\d.]+ (?<filled2026>\d+) [\d,]+(?: |$)/ }],
    },
  })),
};

export default config;
