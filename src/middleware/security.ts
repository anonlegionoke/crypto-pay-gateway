import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function getRateLimiter() {
  const hasUpstashConfig =
    !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!hasUpstashConfig) {
    return null;
  }

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(
      Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
      '15m' // 15 minutes in duration format
    ),
  });
}

const ratelimit = getRateLimiter();

export async function securityMiddleware(request: NextRequest) {
  // Get IP address from headers or fallback
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

  // Rate limiting
  // Add rate limit headers
  const response = NextResponse.next();
  if (ratelimit) {
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // CORS headers
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = (process.env.NEXT_PUBLIC_CORS_ORIGIN || '').split(',');

  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'");

  return response;
} 
