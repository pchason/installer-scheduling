import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { jobs, purchaseOrders } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    if (status) {
      const result = await db.select().from(jobs).where(eq(jobs.status, status as any));
      return NextResponse.json(result);
    }

    const result = await db.select().from(jobs);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobNumber, streetAddress, city, state, zipCode, locationId, status, dateStart, dateEnd } = body;

    const result = await db
      .insert(jobs)
      .values({
        jobNumber,
        streetAddress,
        city,
        state,
        zipCode,
        locationId,
        status: status ?? 'pending',
        startDate: dateStart || null,
        endDate: dateEnd || null,
      })
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    const createdJob = result[0]!;

    // Create 3 purchase orders for the job, each with one trade field populated with random value
    try {
      const poData: Array<{
        jobId: number;
        poNumber: string;
        trimLinearFeet: string | null;
        stairRisers: number | null;
        doorCount: number | null;
      }> = [
        {
          jobId: createdJob.jobId,
          poNumber: `${createdJob.jobNumber}-PO-001`,
          trimLinearFeet: (Math.random() * 1000).toFixed(2),
          stairRisers: null,
          doorCount: null,
        },
        {
          jobId: createdJob.jobId,
          poNumber: `${createdJob.jobNumber}-PO-002`,
          trimLinearFeet: null,
          stairRisers: Math.floor(Math.random() * 150) + 1,
          doorCount: null,
        },
        {
          jobId: createdJob.jobId,
          poNumber: `${createdJob.jobNumber}-PO-003`,
          trimLinearFeet: null,
          stairRisers: null,
          doorCount: Math.floor(Math.random() * 15) + 1,
        },
      ];

      await db.insert(purchaseOrders).values(poData);
      logger.info({ jobId: createdJob.jobId }, 'Created 3 purchase orders for job');
    } catch (poError) {
      logger.warn(
        { jobId: createdJob.jobId, error: poError },
        'Failed to create purchase orders for job'
      );
      // Continue - we still want to return the created job even if PO creation fails
    }

    // Trigger autonomous scheduling workflow (non-blocking, fire-and-forget)
    try {
      logger.info({ jobId: createdJob?.jobId }, 'Triggering autonomous scheduling for new job');

      // Call the webhook endpoint to trigger the scheduling agent (non-blocking)
      const webhookUrl = `${request.nextUrl.origin}/api/webhooks/job-created`;
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: createdJob?.jobId }),
      }).catch((error) => {
        logger.warn(
          { jobId: createdJob?.jobId, error },
          'Failed to trigger scheduling workflow'
        );
      });

      logger.info({ jobId: createdJob?.jobId }, 'Autonomous scheduling triggered');
    } catch (webhookError) {
      logger.warn(
        { jobId: createdJob?.jobId, error: webhookError },
        'Failed to initiate scheduling workflow'
      );
      // Continue - we still want to return the created job even if scheduling fails
    }

    return NextResponse.json(createdJob, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
