import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '개인정보처리방침 · 수시 지원 현황' };

const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS ?? 90) || 90;

export default function PrivacyPage() {
  return (
    <>
      <header className="site">
        <div className="wrap">
          <h1>
            <Link href="/">수시 지원 현황</Link>
          </h1>
        </div>
      </header>
      <main className="wrap prose">
        <section>
          <h2>개인정보처리방침</h2>
          <p>이 사이트는 회원가입 없이 이용하며, 이름·연락처 등 직접 입력받는 개인정보는 없습니다.</p>

          <h2>자동으로 수집하는 항목</h2>
          <ul>
            <li>접속 IP 주소, 브라우저 정보(User-Agent), 접속 일시</li>
            <li>이용 기록: 검색어, 조회한 모집단위, 입력한 예비번호, 직접 추가한 지원 정보</li>
          </ul>

          <h2>이용 목적</h2>
          <p>서비스 운영·장애 대응, 부정 이용 방지, 이용 통계 작성에만 사용합니다.</p>

          <h2>보관 기간</h2>
          <p>수집일로부터 {RETENTION_DAYS}일이 지나면 자동으로 파기합니다.</p>

          <h2>브라우저에 저장되는 정보</h2>
          <p>
            &lsquo;내 지원&rsquo; 목록과 예비번호는 이용자 브라우저의 로컬 저장소에만 보관되며, 브라우저 데이터를 삭제하면
            함께 지워집니다.
          </p>
        </section>
      </main>
    </>
  );
}
