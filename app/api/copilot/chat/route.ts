import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      );
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Invalid request: last message must be from user' },
        { status: 400 }
      );
    }

    // For now, return a simple response
    // In a real implementation, you would:
    // 1. Call an LLM API (OpenAI, Claude, etc.)
    // 2. Use the LLM to understand the user's intent
    // 3. Call appropriate database queries or APIs
    // 4. Return a relevant response

    const userMessage = lastMessage.content;

    // Simple intent detection based on keywords
    let responseText = '';

    if (userMessage.toLowerCase().includes('job')) {
      responseText =
        'I can help you manage jobs. You can view active jobs, create new jobs, or check job status.';
    } else if (userMessage.toLowerCase().includes('install') || userMessage.toLowerCase().includes('schedule')) {
      responseText =
        'I can help you with installer scheduling. You can assign installers to jobs, view schedules, and manage availability.';
    } else if (userMessage.toLowerCase().includes('booking') || userMessage.toLowerCase().includes('assignment')) {
      responseText =
        'I can help you with installer assignments. You can view all assignments, create new ones, or modify existing schedules.';
    } else {
      responseText =
        'I can help you manage installation scheduling. Ask me about jobs, installers, schedules, or assignments.';
    }

    return NextResponse.json({
      role: 'assistant',
      content: responseText,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
