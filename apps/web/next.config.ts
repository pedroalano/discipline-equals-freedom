import type { NextConfig } from 'next';

const isProduction = process.env['NODE_ENV'] === 'production';
const wsUrl = process.env['NEXT_PUBLIC_WS_URL'] ?? 'http://localhost:3001';
const wsConnectSrc = wsUrl.replace(/^http/, 'ws');

const csp = [
  "default-src 'self'",
  "img-src 'self' https://images.unsplash.com data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${wsUrl} ${wsConnectSrc}`,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
