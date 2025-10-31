import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { purchaseOrders } from '@/lib/database/schema';
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
    const poId = parseInt(id, 10);

    const result = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.poId, poId));

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Purchase order ${poId} not found` },
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
    const poId = parseInt(id, 10);
    const body = await request.json();
    const {
      poNumber,
      trimLinearFeet,
      stairRisers,
      doorCount,
      status,
    } = body;

    // Validate that at least one work type is specified if any are provided
    if (
      (trimLinearFeet !== undefined || stairRisers !== undefined || doorCount !== undefined) &&
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

    const updateData: any = {};
    if (poNumber !== undefined) updateData.poNumber = poNumber;
    if (trimLinearFeet !== undefined) updateData.trimLinearFeet = parseFloat(trimLinearFeet);
    if (stairRisers !== undefined) updateData.stairRisers = parseInt(stairRisers, 10);
    if (doorCount !== undefined) updateData.doorCount = parseInt(doorCount, 10);
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    const result = await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.poId, poId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Purchase order ${poId} not found` },
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
    const poId = parseInt(id, 10);

    const result = await db
      .delete(purchaseOrders)
      .where(eq(purchaseOrders.poId, poId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: `Purchase order ${poId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: result[0] });
  } catch (error) {
    return handleApiError(error);
  }
}
