import { NextRequest, NextResponse } from 'next/server';
import { schedulingAgent } from '@/lib/mastra/agents';
import { assignInstallersToScheduledJobsLogic } from '@/lib/common/installer-assignment';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Starting autonomous job scheduling and installer assignment');

    // Create a prompt for the agent to schedule jobs
    const prompt = `You are responsible for scheduling all unscheduled jobs. Follow these steps exactly:

STEP 1 - SCHEDULE ALL UNSCHEDULED JOBS:
Call the schedule_jobs_without_schedules tool to automatically create schedules for all jobs that don't have schedules yet.

STEP 2 - PROVIDE SUMMARY:
After the tool completes, provide a summary of:
- Total jobs scheduled
- The final state of all scheduled jobs

Let the tools handle the work - they will automatically process all jobs for you.`;

    // Run the scheduling agent to schedule jobs
    const schedulingResult = await schedulingAgent.generate(prompt);

    logger.info(
      { schedulingResult },
      'Job scheduling completed successfully'
    );

    // After scheduling is complete, deterministically assign installers to scheduled jobs
    logger.info('Starting installer assignment for scheduled jobs');
    const assignmentResult = await assignInstallersToScheduledJobsLogic(10);

    logger.info(
      { assignmentResult },
      'Installer assignment completed successfully'
    );

    return NextResponse.json({
      success: true,
      message: 'Job scheduling and installer assignment completed',
      schedulingResult: schedulingResult,
      assignmentResult: assignmentResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Error in job scheduling and installer assignment endpoint');
    return NextResponse.json(
      {
        error: 'Failed to schedule jobs and assign installers',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
