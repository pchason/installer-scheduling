import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/error-handler';
import { mastra } from '@/lib/mastra';

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

    // Convert messages to the format expected by the agent
    const conversationHistory = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Use the chat agent to generate a response
    const response = await mastra.getAgent('chatAgent').generate(conversationHistory, {
      maxSteps: 10,
    });

    return NextResponse.json({
      role: 'assistant',
      content: response.text,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
