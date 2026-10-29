import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  transpilePackages: ['@forja/core'],
  // PGlite carrega arquivos WASM via import.meta.url; precisa ficar fora do bundle.
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Fotos dos exercícios: mudam raramente; cache de 7 dias.
      { source: '/exercicios/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
};

export default config;
