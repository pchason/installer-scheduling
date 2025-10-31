import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/client';
import { handleApiError } from '@/app/api/error-handler';
import { chatMessages } from '@/lib/database/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, messageText, responseText } = body;

    const result = await db
      .insert(chatMessages)
      .values({
        userId,
        messageText,
        responseText,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
