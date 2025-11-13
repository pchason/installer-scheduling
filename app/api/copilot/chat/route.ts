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

    // Generate streaming response using ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          // Use the chat agent to generate a response
          const response = await mastra.getAgent('chatAgent').generate(conversationHistory, {
            maxSteps: 10,
            modelSettings: { temperature: 0.2 },
          });

          // Check if response text is empty or just whitespace
          let text = response.text;
          if (!text || text.trim() === '') {
            text = "I'm sorry, but I wasn't able to process that request. What else can I help you with?";
          }

          // Stream the response character by character for a streaming effect
          const chunkSize = 5; // Stream in chunks of 5 characters
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.substring(i, i + chunkSize);
            const sseMessage = `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
            // Add a small delay to make streaming visible
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Send completion message
          controller.enqueue(encoder.encode('data: {"type": "done"}\n\n'));
          controller.close();
        } catch (error) {
          const errorMessage = `data: ${JSON.stringify({ type: 'error', error: (error as Error).message })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
