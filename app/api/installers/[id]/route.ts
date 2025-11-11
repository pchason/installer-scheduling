import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { installers } from '@/lib/database/schema';
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

    const result = await db
      .select()
      .from(installers)
      .where(eq(installers.installerId, installerId));

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    return handleApiError(error);
  }
}
