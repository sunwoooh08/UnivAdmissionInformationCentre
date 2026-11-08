# UnivAdmissionInformationCentre

수시 지원 대학의 발표일·면접일·등록 일정과 최근 3개년 충원 현황을 한 화면에 정리하는 사이트.

- **모집단위 검색**: 대학·전형·학과로 찾아 &lsquo;내 지원&rsquo;(최대 6개)에 담기
- **일정**: 1단계 발표, 면접·대학별고사, 최초합격 발표, 등록, 충원 통보·등록 마감과 D-day, 6개 대학 타임라인
- **충원 현황**: 3개년 모집인원·충원인원·충원율 차트
- **예비번호 분석**: 내 예비번호로 충원 합격 가능성(%)과 연도별 합격권 여부
- **직접 추가**: 아직 수집되지 않은 대학은 모집요강을 보고 직접 입력 (이 브라우저에만 저장)
- **출처·제보**: 모든 값에 대학 공식 자료 링크와 확인일, &lsquo;정보가 틀렸나요?&rsquo; 제보

대학 데이터는 각 대학 입학처가 게시한 입시결과 파일에서 자동으로 수집하고, 정해진 규칙으로 검증한 뒤 바로 반영합니다.
공통 일정은 한국대학교육협의회 2027학년도 대학입학전형 시행계획 기준입니다.

## 구성

```
packages/shared   타입, 날짜 계산, 충원 확률 모델, 자동 반영 검증 규칙 (공용)
apps/api          NestJS API          :4000  (SQLite: DATA_DIR/uaic.db)
apps/web          Next.js 웹          :3000  (/api/* 일부를 API로 프록시)
apps/collector    대학 자료 수집기 (매일 05:17 KST)
deploy/deploy.sh  Ubuntu 서버 설치·배포 스크립트
```

관리자 페이지는 별도 저장소 [UAIC-admin](https://github.com/sunwoooh08/UAIC-admin)에 있습니다.

## 로컬 실행

Node.js 20.9 이상.

```bash
npm install
```

```bash
npm run dev
```

웹 http://localhost:3000 · API http://localhost:4000/api

```bash
npm test
```

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/schedule` | 수시 공통 일정 |
| GET | `/api/admissions?q=&category=` | 모집단위 검색 |
| GET | `/api/admissions/:id` | 상세 |
| GET | `/api/admissions/:id/outlook?rank=12` | 예비번호별 합격 가능성 |
| POST | `/api/reports` | 오류 제보 (IP당 10분에 5건) |
| GET | `/api/admin/logs`, `/api/admin/logs/summary` | 접속 기록 |
| POST | `/api/admin/ingest` | 수집 결과 반영 (수집기 전용) |
| POST / GET | `/api/admin/coverage` | 대학별 수집 현황 |
| GET | `/api/admin/ingest/runs`, `/api/admin/ingest/log` | 수집 실행·반영 기록 |
| GET / POST | `/api/admin/admissions[/:id][/hide\|unhide\|revert/:rev]` | 데이터 조회·숨기기·되돌리기 |
| GET / POST | `/api/admin/reports[/:id/resolve]` | 제보 |

관리자 API는 `ADMIN_ALLOWED_IPS`에 있는 주소에서 `Authorization: Bearer <ADMIN_TOKEN>`으로 호출할 때만 응답하고, 그 밖에는 404를 돌려줍니다.

### API 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | |
| `DATA_DIR` | `./data` | DB(`uaic.db`), 접속 기록, 수집 원본 캐시 위치 |
| `ADMIN_TOKEN` | – | 32자 이상. 없으면 관리자 API 비활성 |
| `ADMIN_ALLOWED_IPS` | `127.0.0.1,::1` | 관리자 API를 허용할 접속지 |
| `TRUST_PROXY` | `loopback` | 접속 IP를 판별할 때 믿을 프록시 |
| `LOG_RETENTION_DAYS` | `90` | 접속 기록 보관 기간 |

### 웹 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `API_INTERNAL_URL` | `http://127.0.0.1:4000` | API 주소 (빌드할 때 정해짐) |
| `LOG_RETENTION_DAYS` | `90` | 개인정보처리방침에 표시할 보관 기간 |

## 대학 자료 수집

```
수집기 ──(대학 입학처 PDF)──▶ 표 추출 ──▶ API 자동 검증 ──▶ 통과하면 바로 공개
                                              └ 실패하면 반영하지 않고 기록만
```

- **대학 목록**: `apps/collector/src/registry/universities.json`에 전국 4년제 203곳이 들어 있습니다. 출처는 공공데이터포털 [전국대학및전문대학정보표준데이터](https://www.data.go.kr/data/15107736/standard.do)(한국대학교육협의회)이고, `node apps/collector/scripts/update-registry.mjs`로 갱신합니다.
- **대학별 설정**: `apps/collector/src/configs/index.ts`. 설정이 없는 대학은 어드민 &lsquo;대학별 현황&rsquo;에 &lsquo;설정 필요&rsquo;로 나옵니다.
- **예의 지키기**: robots.txt를 지킵니다(RFC 9309, 5xx면 그날은 건너뜀). 같은 서버에는 3초 간격으로 요청하고, 바뀐 파일만 다시 받습니다. User-Agent에는 연락처를 적습니다.
- **자동 반영 규칙** (`packages/shared/src/ingest.ts`): 음수·0명, 충원이 모집의 10배 초과, 수시 기간 밖 날짜, 일정 순서 오류, 같은 학년도 값의 급변을 막습니다. 바뀔 때마다 이전 값을 남기므로 어드민에서 되돌릴 수 있습니다.

### 대학 추가하기

입학처에서 학과별 충원(또는 충원율)이 있는 입시결과 PDF를 찾은 뒤, `configs/index.ts`에 항목을 추가합니다.

```ts
{
  id: 'konkuk',                         // universities.json 의 id
  status: 'active',
  results: [{
    label: '건국대학교 2026학년도 입시결과(통합)',
    url: 'https://www.konkuk.ac.kr/bbs/admission/6290/1216634/download.do',
    format: 'pdf',
    years: [2026],
    spec: {
      section: /▷\s*(?<track>\S.*?)\s*$/g,                                       // 전형 제목 줄
      rows: [{ pattern: /^(?<quota2026>\d+) [\d.]+ (?<filled2026>\d+|-)(?: |$)/ }], // 모집단위 뒤 숫자들
    },
  }],
}
```

- 행 패턴의 이름 그룹: `quotaYYYY`(모집인원), `filledYYYY`(충원인원·충원합격순위), `rateYYYY`(충원율 %, 모집인원으로 인원 계산)
- 표가 좌우로 나란히 있으면 제목 줄에 제목이 두 개 잡히고, 그 위치로 좌우를 나눕니다.
- `sectionMarker`, 그리고 기본으로 들어 있는 정시·수능 줄 감지가 모르는 표의 행이 앞 전형에 붙는 것을 막습니다.
- 확인: `pdftotext -layout 파일.pdf -`로 표 모양을 보고, `npm run collect -- --only konkuk --dry-run`으로 결과를 봅니다.
- 자동 수집을 하지 않을 대학은 이유와 함께 `status`를 적습니다(`robots-blocked`, `restricted`, `no-official-data`, `needs-ocr`).

## 충원 합격 가능성 계산

1. 연도별 충원율 = 충원인원 ÷ 모집인원. 여기에 올해 모집인원을 곱해 올해 기준으로 환산합니다. 모집인원이 공개되지 않은 해는 충원인원을 그대로 씁니다.
2. 최근 연도부터 50·30·20% 가중평균을 예상 충원인원으로 봅니다.
3. 퍼짐은 연도별 차이의 가중 표준편차로 잡고, 평균의 20%와 1명 중 큰 값을 하한으로 둡니다.
4. 합격 가능성 = P(올해 충원인원 ≥ 내 예비번호), 정규분포 근사.
5. 80% 이상 안정, 50% 이상 적정, 20% 이상 소신, 그 아래 어려움.

## 서버 배포 (Ubuntu VPS)

빈 Ubuntu 22.04/24.04 서버에서 아래 명령 하나로 설치합니다.

```bash
curl -fsSL -H "Authorization: token <GitHub 토큰>" https://raw.githubusercontent.com/sunwoooh08/UnivAdmissionInformationCentre/main/deploy/deploy.sh -o deploy.sh && sudo bash deploy.sh
```

공개 저장소라면 `-H "Authorization: ..."` 부분은 빼도 됩니다.

GitHub 아이디와 토큰은 실행 중에 물어봅니다. 미리 넘기려면 인자나 환경변수를 씁니다. 환경변수 방식은 토큰이 셸 기록에 남지 않습니다.

```bash
sudo bash deploy.sh --gh-user <아이디> --gh-token <토큰> --branch main
```

```bash
sudo GH_USER=<아이디> GH_TOKEN=<토큰> bash deploy.sh
```

토큰은 GitHub → Settings → Developer settings → Fine-grained tokens에서 두 저장소를 선택하고 Contents 권한을 Read-only로 만들면 됩니다. 스크립트는 설치를 시작하기 전에 두 저장소 접근을 먼저 확인하고, 실패하면 이유를 보여준 뒤 토큰을 다시 묻습니다.

스크립트가 하는 일은 다음과 같습니다.

1. GitHub 사용자명·토큰, 도메인, 수집기 연락처, 어드민 아이디·비밀번호 입력
2. apt로 git, screen, nginx, build-essential, poppler-utils, Node.js 22 설치
3. `uaic` 계정을 만들고 두 저장소를 `/opt/uaic/app`, `/opt/uaic/admin`에 클론
4. `/opt/uaic/config/*.env` 생성 (ADMIN_TOKEN·세션 키 자동 생성, 권한 600)
5. 빌드와 테스트
6. `screen` 세션 `uaic-api`, `uaic-web`, `uaic-admin`으로 실행 (재부팅 시 cron으로 자동 시작)
7. 첫 수집 실행, 이후 매일 05:17(KST) 자동 수집
8. nginx :80 → 웹, 선택 시 Let's Encrypt HTTPS와 ufw 방화벽 설정

같은 명령을 다시 실행하면 최신 코드를 받아 다시 빌드하고 재시작합니다. 기존 비밀값과 데이터는 유지됩니다.
