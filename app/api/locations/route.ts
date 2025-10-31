import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { geographicLocations } from '@/lib/database/schema';

export async function GET() {
  try {
    const result = await db.select().from(geographicLocations);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationName, zipCode, city, state } = body;

    const result = await db
      .insert(geographicLocations)
      .values({
        locationName,
        zipCode,
        city,
        state,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
