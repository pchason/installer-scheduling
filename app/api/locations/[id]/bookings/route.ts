import { NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { jobs, jobSchedules } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

interface Params {
  id: string;
}

export async function GET(
  _request: unknown,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id: locationId } = await params;

    const result = await db
      .select()
      .from(jobs)
      .innerJoin(jobSchedules, eq(jobSchedules.jobId, jobs.jobId))
      .where(eq(jobs.locationId, parseInt(locationId, 10)));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
