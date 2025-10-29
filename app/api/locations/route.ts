import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';

export async function GET() {
  try {
    // Placeholder: Get all locations
    return NextResponse.json({
      message: 'GET /api/locations - List locations',
      placeholder: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Placeholder: Create location
    return NextResponse.json(
      {
        message: 'POST /api/locations - Create location',
        body,
        placeholder: true,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
