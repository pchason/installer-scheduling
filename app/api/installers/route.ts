import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { installers } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trade = searchParams.get('trade');
    const isActive = searchParams.get('isActive');

    const conditions = [];

    if (trade) {
      conditions.push(eq(installers.trade, trade as any));
    }

    if (isActive !== null) {
      const active = isActive === 'true';
      conditions.push(eq(installers.isActive, active));
    }

    let baseQuery = db.select().from(installers);

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
    const { firstName, lastName, trade, phone, email, isActive } = body;

    const result = await db
      .insert(installers)
      .values({
        firstName,
        lastName,
        trade,
        phone,
        email,
        isActive: isActive ?? true,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
