import { NextRequest, NextResponse } from 'next/server';
import { schedulingAgent } from '@/lib/mastra/agents';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    logger.info({ jobId }, 'Job created webhook triggered - starting autonomous scheduling');

    // Create the prompt for the agent
    const prompt = `A new job (ID: ${jobId}) has been created in the system.

Please analyze this job and its purchase orders, then schedule the appropriate installers.

Steps:
1. Retrieve the job details and all purchase orders
2. Determine what trades are needed based on the PO quantities (check trim_linear_feet, stair_risers, door_count)
3. Find available installers for each needed trade
4. Create schedules and assign installers
5. Provide a summary of what was scheduled

Be thorough and autonomous - make all scheduling decisions without asking for confirmation.`;

    // Run the scheduling agent
    const result = await schedulingAgent.run(prompt);

    logger.info(
      { jobId, result },
      'Autonomous scheduling completed successfully'
    );

    return NextResponse.json({
      success: true,
      jobId,
      schedulingResult: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Error in job creation webhook');
    return NextResponse.json(
      {
        error: 'Failed to trigger autonomous scheduling',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
