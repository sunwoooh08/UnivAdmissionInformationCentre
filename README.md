# UnivAdmissionInformationCentre

수시 지원 대학의 발표일·면접일·등록 일정과 최근 3개년 충원 현황을 한 화면에 정리하는 사이트.

- **모집단위 검색**: 대학·전형·학과로 찾아 &lsquo;내 지원&rsquo;(최대 6개)에 담기
- **일정**: 1단계 발표, 면접·대학별고사, 최초합격 발표, 등록, 충원 통보·등록 마감과 D-day, 6개 대학 타임라인
- **충원 현황**: 3개년 모집인원·충원인원·충원율 차트
- **예비번호 분석**: 내 예비번호로 충원 합격 가능성(%)과 연도별 합격권 여부
- **직접 추가**: 모집요강과 입시결과를 보고 내 지원 정보를 입력

> 기본으로 들어 있는 대학 데이터는 화면 예시용 가상 데이터입니다. 실제 지원 내역은 &lsquo;직접 추가&rsquo;로 입력하세요.
> 공통 일정은 한국대학교육협의회 2027학년도 대학입학전형 시행계획 기준입니다.

## 구성

```
packages/shared   타입, 날짜 계산, 충원 확률 모델 (웹·API 공용)
apps/api          NestJS API          :4000
apps/web          Next.js 웹          :3000  (/api/* 일부를 API로 프록시)
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
| POST / PUT / DELETE | `/api/admissions[/:id]` | 직접 추가한 항목 관리 |
| GET | `/api/admin/logs`, `/api/admin/logs/summary` | 접속 기록 (관리자 전용) |

관리자 API는 `ADMIN_ALLOWED_IPS`에 있는 주소에서 `Authorization: Bearer <ADMIN_TOKEN>`으로 호출할 때만 응답하고, 그 밖에는 404를 돌려줍니다.

### API 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | |
| `DATA_DIR` | `./data` | 직접 추가한 항목, 접속 기록 저장 위치 |
| `ADMIN_TOKEN` | – | 32자 이상. 없으면 관리자 API 비활성 |
| `ADMIN_ALLOWED_IPS` | `127.0.0.1,::1` | 관리자 API를 허용할 접속지 |
| `TRUST_PROXY` | `loopback` | 접속 IP를 판별할 때 믿을 프록시 |
| `LOG_RETENTION_DAYS` | `90` | 접속 기록 보관 기간 |

### 웹 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `API_INTERNAL_URL` | `http://127.0.0.1:4000` | API 주소 (빌드할 때 정해짐) |
| `LOG_RETENTION_DAYS` | `90` | 개인정보처리방침에 표시할 보관 기간 |

## 충원 합격 가능성 계산

1. 연도별 충원율 = 충원인원 ÷ 모집인원. 여기에 올해 모집인원을 곱해 올해 기준으로 환산합니다.
2. 최근 연도부터 50·30·20% 가중평균을 예상 충원인원으로 봅니다.
3. 퍼짐은 연도별 차이의 가중 표준편차로 잡고, 평균의 20%와 1명 중 큰 값을 하한으로 둡니다.
4. 합격 가능성 = P(올해 충원인원 ≥ 내 예비번호), 정규분포 근사.
5. 80% 이상 안정, 50% 이상 적정, 20% 이상 소신, 그 아래 어려움.

## 서버 배포 (Ubuntu VPS)

빈 Ubuntu 22.04/24.04 서버에서 아래 명령 하나로 설치합니다.

```bash
curl -fsSL -H "Authorization: token <GitHub 토큰>" https://raw.githubusercontent.com/sunwoooh08/UnivAdmissionInformationCentre/main/deploy/deploy.sh -o deploy.sh && sudo bash deploy.sh
```

공개 저장소라면 `-H "Authorization: ..."` 부분은 빼도 됩니다. 스크립트가 하는 일은 다음과 같습니다.

1. GitHub 사용자명·토큰, 도메인, 어드민 아이디·비밀번호 입력
2. apt로 git, screen, nginx, build-essential, Node.js 22 설치
3. `uaic` 계정을 만들고 두 저장소를 `/opt/uaic/app`, `/opt/uaic/admin`에 클론
4. `/opt/uaic/config/*.env` 생성 (ADMIN_TOKEN·세션 키 자동 생성, 권한 600)
5. 빌드와 테스트
6. `screen` 세션 `uaic-api`, `uaic-web`, `uaic-admin`으로 실행 (재부팅 시 cron으로 자동 시작)
7. nginx :80 → 웹, 선택 시 Let's Encrypt HTTPS와 ufw 방화벽 설정

같은 명령을 다시 실행하면 최신 코드를 받아 다시 빌드하고 재시작합니다. 기존 비밀값과 데이터는 유지됩니다.
