import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '수시 지원 현황',
  description: '지원한 대학의 발표일·면접일·등록 일정과 최근 3개년 충원 현황을 한 화면에서 확인합니다.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        {children}
        <footer className="site">
          <div className="wrap">
            <p>일정과 충원 수치는 참고용입니다. 최종 확인은 각 대학 모집요강과 입학처 공지로 하세요.</p>
            <p>
              <Link href="/privacy">개인정보처리방침</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
