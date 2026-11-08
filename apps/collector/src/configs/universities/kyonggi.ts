import type { UniversityConfig } from '../types.js';

const y = (year: number) => `(?<quota${year}>\\d+) [\\d,]+ [\\d.]+ (?<filled${year}>\\d+|-)`;

const config: UniversityConfig = {
  id: 'kyonggi',
  status: 'active',
  admissionSite: 'https://enter.kyonggi.ac.kr',
  note: '2027 수시모집요강 PDF는 글자 정보가 없는 이미지(윤곽선) 파일이라 모집인원·일정 미수집. SW우수자·논술은 표 모양이 달라 제외, AI컴퓨터공학부(전공 분리)도 칸이 어긋나 제외',
  results: [
    {
      label: '경기대학교 2026~2024학년도 전형결과(수시, 정시)',
      url: 'https://enter.kyonggi.ac.kr/ajaxfile/FR_SVC/FileDownload.do?FILE_ORG_NM=%2528%25EA%25B2%25BD%25EA%25B8%25B0%25EB%258C%2580%2529%25202026~2024%25ED%2595%2599%25EB%2585%2584%25EB%258F%2584%2520%25EC%25A0%2584%25ED%2598%2595%25EA%25B2%25B0%25EA%25B3%25BC%2528%25EC%2588%2598%25EC%258B%259C%252C%25EC%25A0%2595%25EC%258B%259C%2529.pdf&FILE_NM=202607/1785391183911_0.pdf',
      format: 'pdf',
      years: [2026, 2025, 2024],
      spec: {
        // "5-1. 학생부종합(KGU학생부종합전형) 3개년 지원결과" (N-2, N-3 성적 표와 정시 표는 제외)
        section: /^\s*\d+-1\.\s*(?<track>(?:학생부교과|학생부종합|논술|실기\/실적)\([^)]+\))\s*\d개년 지원결과/g,
        sectionMarker: /^\s*\d+-\d+\.|^\s*\d+\s+(수시모집|정시모집)/,
        // SW우수자: 전공이 줄을 나눠 연도 칸이 어긋남 / 논술: 계열(언어·사회논술·수리논술) 단위
        skipTrack: /SW우수자|논술/,
        // 미선발 칸, AI컴퓨터공학부 전공 분리 행(연도 칸이 어긋남)은 버림
        skipDept:
          /^(계|합계|소계|총계|전체|모집단위|구분|-|AI|컴퓨터|공학부|AI컴퓨터공학부|컴퓨터공학전공|인공지능전공|SW안전보안전공)$|미선발|학년도/,
        // 연도별: 모집인원 지원인원 경쟁률 충원인원(마지막 충원합격 예비번호) [수능최저 충족률%]
        rows: [
          {
            tracks: /교과성적우수자/,
            pattern: new RegExp(`^${y(2026)} [\\d.]+%(?: ${y(2025)} [\\d.]+%(?: ${y(2024)} [\\d.]+%)?)?(?: |$)`),
          },
          { pattern: new RegExp(`^${y(2026)}(?: ${y(2025)}(?: ${y(2024)})?)?(?: |$)`) },
        ],
      },
    },
  ],
};

export default config;
