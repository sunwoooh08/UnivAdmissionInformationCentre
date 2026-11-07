import type { UniversityConfig } from './types.js';

/**
 * 대학별 수집 설정. 대학을 추가하려면 여기에 항목을 넣는다.
 * 파일 주소와 표 모양은 2026-11 기준으로 각 대학 입학처에서 확인했다.
 * 등록되지 않은 대학은 '설정 필요(unconfigured)'로 표시된다.
 */

export const CONFIGS: UniversityConfig[] = [
  {
    id: 'konkuk',
    status: 'active',
    admissionSite: 'https://www.konkuk.ac.kr/admission',
    results: [
      {
        label: '건국대학교 2026학년도 입시결과(통합)',
        url: 'https://www.konkuk.ac.kr/bbs/admission/6290/1216634/download.do',
        format: 'pdf',
        years: [2026],
        spec: {
          // ▷ 학생부교과(KU지역균형)
          section: /▷\s*(?<track>\S.*?)\s*$/g,
          sectionMarker: /^\s*(▷|\[(수시|정시)\])/,
          // 모집인원 경쟁률 충원합격순위 …  (모집인원 3명 이하는 순위가 '-' 로 비공개)
          rows: [{ pattern: /^(?<quota2026>\d+) [\d.]+ (?<filled2026>\d+|-)(?: |$)/ }],
          skipTrack: /수능|정시/,
        },
      },
    ],
  },
  {
    id: 'yonsei',
    status: 'active',
    admissionSite: 'https://admission.yonsei.ac.kr/seoul',
    note: '입학처는 추천형·활동우수형·국제형·기회균형 등 주요 전형만 공개',
    results: [
      {
        label: '연세대학교 2026학년도 수시모집 선발결과',
        url: 'https://admission.yonsei.ac.kr/seoul/download.asp?furl=bbs/202604201055398D4W8V.PDF&fname=2026%C7%D0%B3%E2%B5%B5+%BC%F6%BD%C3%B8%F0%C1%FD+%BC%B1%B9%DF%B0%E1%B0%FA%2Epdf',
        format: 'pdf',
        years: [2026],
        spec: {
          // "1   학생부교과[추천형]        2    학생부종합[활동우수형]" (좌우 두 표)
          section: /(?<track>학생부(?:교과|종합)\[[^\]]+\])/g,
          // 모집인원 경쟁률(n : 1) 충원합격순위
          rows: [{ pattern: /^(?<quota2026>\d+) [\d.]+ : 1 (?<filled2026>\d+)(?: |$)/ }],
        },
      },
    ],
  },
  {
    id: 'dongguk',
    status: 'active',
    admissionSite: 'https://ipsi.dongguk.edu',
    results: [
      {
        label: '동국대학교 2026학년도 입학전형 결과',
        url: 'https://ipsi.dongguk.edu/upload/file/202609181646284P926C.PDF',
        format: 'pdf',
        years: [2026, 2025],
        spec: {
          // ■ [학생부종합] Do Dream   /   ■ 논술전형
          section: /■\s*(?:\[(?<category>[^\]]+)\]\s*)?(?<track>\S.*?)(?=\s{2,}|$)/g,
          sectionMarker: /^\s*■/,
          // 학생부 성적표·수능 성적표·모집단위별 충원율(정시 포함) 표는 건너뜀
          skipTrack: /성적|분포|충원율|수능/,
          // 2026: 모집 지원 경쟁률 (등급…) 충원율%   2025: 모집 지원 경쟁률 (등급…) 충원율%
          rows: [
            {
              pattern:
                /^(?<quota2026>\d+) [\d,]+ [\d.]+ (?:[\d.]+ )*?(?<rate2026>\d+(?:\.\d+)?)%(?: (?<quota2025>\d+) [\d,]+ [\d.]+ (?:[\d.]+ )*?(?<rate2025>\d+(?:\.\d+)?)%)?/,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'ewha',
    status: 'active',
    admissionSite: 'https://admission.ewha.ac.kr',
    results: [
      {
        label: '이화여자대학교 2024-2026학년도 전형결과',
        url: 'https://admission.ewha.ac.kr/upload/BBS0004/20260528160210YBS9YB.PDF',
        format: 'pdf',
        years: [2026],
        spec: {
          // Ⅰ. 학생부교과(고교추천전형)   (목차 줄은 뒤에 점선이 있어 제외)
          section: /^[ⅠⅡⅢⅣⅤⅥⅦ]\.\s*(?<track>\S[^·…]*?\))\s*$/g,
          // 모집인원 경쟁률(n : 1) 충원인원
          rows: [{ pattern: /^(?<quota2026>\d+) [\d.]+ : 1 (?<filled2026>\d+)(?: |$)/ }],
          skipTrack: /수능/,
        },
      },
    ],
  },
  {
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
  },
  {
    id: 'hanyang',
    status: 'active',
    admissionSite: 'https://go.hanyang.ac.kr',
    note: '결과표에 연도별 모집인원이 없어 추가합격 인원만 반영',
    results: [
      {
        label: '한양대학교 2024~2026학년도 주요 전형 입시결과',
        url: 'https://go.hanyang.ac.kr/file/download.do?menu=board&file_no=20773&type=B_1_8',
        format: 'pdf',
        years: [2026, 2025, 2024],
        spec: {
          // 펼친 두 쪽에 같은 제목이 나란히: "학생부교과 (추천형)      학생부교과 (추천형)"
          section: /(?<track>학생부(?:교과|종합)\s*\([^)]+\)|논술\s*전형)/g,
          sectionAlone: true,
          ignoreCells: /^(인문|자연|예체능|통합|인문\/자연|인문·자연)$/,
          rows: [
            // 경쟁률 2026 2025 / 추가합격 2026 2025 / 내신 …  (종합 추천형은 2개년)
            { tracks: /종합\(추천형\)/, pattern: /^[\d.]+ [\d.]+ (?<filled2026>\d+) (?<filled2025>\d+) \d+\.\d\d/ },
            // 경쟁률 2026 2025 2024 / 추가합격 2026 2025 2024
            { pattern: /^\d+\.\d [\d.]+ [\d.]+ (?<filled2026>\d+) (?<filled2025>\d+) (?<filled2024>\d+)(?: |$)/ },
          ],
          renameTrack: (t) => (t.startsWith('논술') ? '논술' : t),
        },
      },
    ],
  },

  // ── 자동 수집하지 않는 대학 (이유 기록) ──
  {
    id: 'cau',
    status: 'robots-blocked',
    admissionSite: 'https://admission.cau.ac.kr',
    note: 'robots.txt 가 Googlebot 외 모든 자동 수집을 금지 (Disallow: /). 입학처 허락 필요',
  },
  {
    id: 'hufs',
    status: 'robots-blocked',
    admissionSite: 'https://adms.hufs.ac.kr',
    note: 'robots.txt 가 모든 자동 수집을 금지 (Disallow: /). 입학처 허락 필요',
  },
  {
    id: 'hongik',
    status: 'restricted',
    admissionSite: 'https://www.hongik.ac.kr/kr/admission',
    note: '입시결과 자료에 "상업적 수단으로 활용할 경우 법적 책임" 문구. 이용 조건 확인 필요',
  },
  {
    id: 'korea',
    status: 'no-official-data',
    admissionSite: 'https://oku.korea.ac.kr',
    note: '입학처에 학과별 결과 표가 없음 (전형결과는 영상으로만 게시)',
  },
  {
    id: 'skku',
    status: 'needs-ocr',
    admissionSite: 'https://admission.skku.edu',
    note: '입시결과 PDF 에 글자 층이 없음 (이미지). 글자 인식(OCR) 필요',
  },
  {
    id: 'snu',
    status: 'unconfigured',
    admissionSite: 'https://admission.snu.ac.kr',
    note: '충원선발현황 PDF 가 개발 환경에서 내려받아지지 않아 표 형식 미확인',
  },
  {
    id: 'sogang',
    status: 'unconfigured',
    admissionSite: 'https://admission.sogang.ac.kr',
    note: '개발 환경에서 접속 불가 (TLS 오류). 자료 위치 확인 필요',
  },
  {
    id: 'khu',
    status: 'unconfigured',
    admissionSite: 'https://iphak.khu.ac.kr',
    note: '개발 환경에서 접속 불가. 자료 위치 확인 필요',
  },
  {
    id: 'uos',
    status: 'unconfigured',
    admissionSite: 'https://admission.uos.ac.kr',
    note: '개발 환경에서 접속 차단. 자료 위치 확인 필요',
  },
];

export const CONFIG_BY_ID = new Map(CONFIGS.map((c) => [c.id, c]));

