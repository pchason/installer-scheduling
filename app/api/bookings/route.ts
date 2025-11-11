import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { installerAssignments, jobSchedules } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const installerId = searchParams.get('installerId');

    const conditions = [];

    if (jobId) {
      conditions.push(eq(jobSchedules.jobId, parseInt(jobId, 10)));
    }

    if (installerId) {
      conditions.push(eq(installerAssignments.installerId, parseInt(installerId, 10)));
    }

    let baseQuery = db
      .select()
      .from(installerAssignments)
      .innerJoin(jobSchedules, eq(jobSchedules.scheduleId, installerAssignments.scheduleId));

    const result = conditions.length > 0
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId, installerId, poId, notes } = body;

    const result = await db
      .insert(installerAssignments)
      .values({
        scheduleId,
        installerId,
        poId,
        notes,
        assignmentStatus: 'assigned',
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
