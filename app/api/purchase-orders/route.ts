import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { purchaseOrders } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');

    let query = db.select().from(purchaseOrders);

    if (jobId) {
      const jobIdNum = parseInt(jobId, 10);
      const result = await query.where(eq(purchaseOrders.jobId, jobIdNum));
      return NextResponse.json(result);
    }

    if (status) {
      const result = await query.where(eq(purchaseOrders.status, status as any));
      return NextResponse.json(result);
    }

    const result = await query;
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jobId,
      poNumber,
      trimLinearFeet,
      stairRisers,
      doorCount,
      status,
    } = body;

    // Validate required fields
    if (!jobId || !poNumber) {
      return NextResponse.json(
        { error: 'jobId and poNumber are required' },
        { status: 400 }
      );
    }

    // Validate that at least one work type is specified
    if (
      (!trimLinearFeet || trimLinearFeet <= 0) &&
      (!stairRisers || stairRisers <= 0) &&
      (!doorCount || doorCount <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            'At least one work type must be specified (trimLinearFeet > 0 OR stairRisers > 0 OR doorCount > 0)',
        },
        { status: 400 }
      );
    }

    const result = await db
      .insert(purchaseOrders)
      .values({
        jobId: parseInt(jobId, 10),
        poNumber,
        trimLinearFeet: trimLinearFeet ? trimLinearFeet.toString() : null,
        stairRisers: stairRisers ? parseInt(stairRisers, 10) : null,
        doorCount: doorCount ? parseInt(doorCount, 10) : null,
        status: status ?? 'pending',
      })
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create purchase order' },
        { status: 500 }
      );
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
