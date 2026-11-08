import type { UniversityConfig } from '../types.js';

const FINAL = '2026-12-18T15:00';
/** 1단계(면접대상자) 발표 11.6.(금) 15:00 이후, 면접고사 11.20.(금) */
const INTERVIEW = { first: '2026-11-06T15:00', exam: ['2026-11-20', '2026-11-20'] as [string, string], final: FINAL };

const config: UniversityConfig = {
  id: 'hanbat',
  status: 'active',
  admissionSite: 'https://www.hanbat.ac.kr/admission/',
  note:
    '2026 입시결과는 XLSX(입시결과 게시판 "2026학년도 입시결과 안내(수시/정시)")로만 게시돼 충원 이력은 읽지 않음. ' +
    '모집요강(모집인원·일정)만 수집. 전형기간 자율화(재직자·만학도 야간) 전형은 제외',
  guide: {
    label: '국립한밭대학교 2027학년도 신입생 수시모집요강',
    url: 'https://www.hanbat.ac.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000194566Rd8&fileSn=0',
    format: 'pdf',
    quotas: [
      {
        // Ⅴ. 세부 전형별 안내: " 4. 학생부종합: 학생부종합(일반)전형" → "1. 모집인원" 표(좌우 두 표)
        chapter: /^\s*\d{1,2}\.\s*(?<category>학생부교과|학생부종합|실기위주|전형기간자율화):\s*(?<track>\S.*?)\s*$/,
        // 머리글 "계열 단과대학 모집단위 모집인원(명)  계열 단과대학 …" 의 '계열' 위치로 좌우를 나눔
        section: /(?<track>계열)(?=\s+단과대학)/g,
        sectionEnd: /^\s*2\.\s|정시|수능\s*위주/,
        skipTrack: /야간\)$/,
        ignoreCells: /^(인문|공학|경상|예체능|인문사회|자연)$/,
        rows: [{ pattern: /^(?<quotaNow>\d+)$/ }],
      },
    ],
    // Ⅲ. 전형일정 (최초합격자 발표 12.18.(금) 15:00 이후, 실기위주전형은 11.6.(금) 15:00 이후)
    schedules: [
      ...['학생부교과(일반)전형', '지역인재(교과)전형', '학생부교과(사회통합)전형', '농어촌학생전형', '특성화고교졸업자전형', '사회적배려자전형'].map(
        (track) => ({ track, first: null, exam: null, final: FINAL }),
      ),
      // 1단계 발표는 "학생부종합(학·석사,일반)을 제외한 학생부종합전형" → 일반·학석사는 일괄
      { track: '학생부종합(일반)전형', first: null, exam: null, final: FINAL },
      { track: '학생부종합(학·석사)전형', first: null, exam: null, final: FINAL },
      { track: '지역인재(종합)전형', ...INTERVIEW },
      { track: '학생부종합(소프트웨어인재)전형', ...INTERVIEW },
      { track: '학생부종합(야간)전형', ...INTERVIEW },
      { track: '실기(일반)전형', first: null, exam: ['2026-10-16', '2026-10-16'], final: '2026-11-06T15:00' },
      { track: '실기우수자전형', first: null, exam: ['2026-10-17', '2026-10-17'], final: '2026-11-06T15:00' },
    ],
  },
};

export default config;
