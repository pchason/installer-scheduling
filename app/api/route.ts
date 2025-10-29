import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'API v1',
    routes: {
      installers: '/api/installers',
      locations: '/api/locations',
      bookings: '/api/bookings',
      chat: '/api/chat',
    },
  });
}
