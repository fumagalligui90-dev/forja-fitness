import { NextResponse, type NextRequest } from 'next/server';

/**
 * CORS apenas para origens listadas em CORS_ORIGINS (ex.: o Expo web em
 * desenvolvimento). Apps nativos não precisam de CORS; a web usa a mesma origem.
 */
const allowed = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, expo-origin',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function proxy(req: NextRequest) {
  const origin = req.headers.get('origin');
  const ok = origin != null && allowed.includes(origin);
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: ok ? corsHeaders(origin) : { Vary: 'Origin' } });
  }
  const res = NextResponse.next();
  if (ok) for (const [k, v] of Object.entries(corsHeaders(origin))) res.headers.set(k, v);
  return res;
}

export const config = { matcher: '/api/:path*' };
