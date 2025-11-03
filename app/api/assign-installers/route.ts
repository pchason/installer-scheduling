import { NextRequest, NextResponse } from 'next/server';
import { schedulingAgent } from '@/lib/mastra/agents';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Starting autonomous installer assignment for unscheduled jobs');

    // Create a prompt for the agent to find and assign installers to unscheduled jobs
    const prompt = `Find all jobs that do not have installers assigned to them and autonomously assign appropriate installers.

Steps:
1. Use find_jobs_without_installers to get jobs that need installer assignments
2. For each job, retrieve its details and purchase orders using get_job_with_pos
3. Analyze the purchase orders to determine what trades are needed
4. Find available installers for each needed trade using find_available_installers
5. Create job schedules using create_job_schedule
6. Assign the best-suited installers using assign_installer
7. Provide a summary of all assignments made

Be thorough and make all assignments autonomously without asking for confirmation.`;

    // Run the scheduling agent
    const result = await schedulingAgent.generate(prompt);

    logger.info(
      { result },
      'Autonomous installer assignment completed successfully'
    );

    return NextResponse.json({
      success: true,
      message: 'Installer assignment completed',
      assignmentResult: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Error in installer assignment endpoint');
    return NextResponse.json(
      {
        error: 'Failed to assign installers',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
