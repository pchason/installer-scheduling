import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from './lib/utils/logger';

export function middleware(request: NextRequest) {
  // Log incoming requests
  logger.info({
    method: request.method,
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  });

  // Create response
  const response = NextResponse.next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  // Add request ID for tracing
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  response.headers.set('X-Request-ID', requestId);

  return response;
}

// Configure which routes to apply middleware to
export const config = {
  matcher: ['/api/:path*'],
};
