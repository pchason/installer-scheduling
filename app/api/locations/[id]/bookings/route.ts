import { NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';

interface Params {
  id: string;
}

export async function GET(
  _request: unknown,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id: locationId } = await params;

    // Placeholder: Get bookings for a specific location
    return NextResponse.json({
      message: 'GET /api/locations/[id]/bookings - Get location bookings',
      locationId,
      placeholder: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
