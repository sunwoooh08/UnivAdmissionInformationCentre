import type { NextConfig } from 'next';

/** 같은 서버(또는 내부망)의 NestJS API 주소. 브라우저에는 노출되지 않는다. */
const API = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

const config: NextConfig = {
  poweredByHeader: false,
  // 공개 사이트는 필요한 경로만 API로 전달한다.
  async rewrites() {
    return [
      { source: '/api/schedule', destination: `${API}/api/schedule` },
      { source: '/api/admissions', destination: `${API}/api/admissions` },
      { source: '/api/admissions/:path*', destination: `${API}/api/admissions/:path*` },
    ];
  },
};

export default config;
