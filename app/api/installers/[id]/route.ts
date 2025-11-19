import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { installers, installerLocations, geographicLocations } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const installerId = parseInt(id, 10);

    if (isNaN(installerId)) {
      return NextResponse.json(
        { error: 'Invalid installer ID' },
        { status: 400 }
      );
    }

    // Get installer details
    const installerData = await db
      .select()
      .from(installers)
      .where(eq(installers.installerId, installerId));

    if (installerData.length === 0) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      );
    }

    // Get installer's locations
    const locationsData = await db
      .select({
        locationId: geographicLocations.locationId,
        locationName: geographicLocations.locationName,
        city: geographicLocations.city,
        state: geographicLocations.state,
      })
      .from(installerLocations)
      .innerJoin(geographicLocations, eq(installerLocations.locationId, geographicLocations.locationId))
      .where(eq(installerLocations.installerId, installerId));

    // Combine installer data with locations
    const result = {
      ...installerData[0],
      locations: locationsData,
    };

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
