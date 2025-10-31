import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { jobs } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

interface Params {
  id: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);

    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.jobId, jobId));

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Job ${jobId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);
    const body = await request.json();
    const {
      jobNumber,
      streetAddress,
      city,
      state,
      zipCode,
      locationId,
      status,
    } = body;

    const updateData: any = {};
    if (jobNumber !== undefined) updateData.jobNumber = jobNumber;
    if (streetAddress !== undefined) updateData.streetAddress = streetAddress;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (locationId !== undefined) updateData.locationId = locationId;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    const result = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.jobId, jobId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Job ${jobId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);

    const result = await db
      .delete(jobs)
      .where(eq(jobs.jobId, jobId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Job ${jobId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: result[0] });
  } catch (error) {
    return handleApiError(error);
  }
}
