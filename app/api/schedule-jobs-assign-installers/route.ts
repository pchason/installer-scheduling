import { NextRequest, NextResponse } from 'next/server';
import { schedulingAgent } from '@/lib/mastra/agents';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Starting autonomous job scheduling and installer assignment');

    // Create a prompt for the agent to schedule jobs and assign installers
    const prompt = `You are responsible for scheduling all unscheduled jobs and assigning installers to them. Follow these steps exactly:

STEP 1 - SCHEDULE ALL UNSCHEDULED JOBS:
Call the schedule_jobs_without_schedules tool to automatically create schedules for all jobs that don't have schedules yet.

STEP 2 - ASSIGN INSTALLERS TO ALL SCHEDULED JOBS:
Call the assign_installers_to_scheduled_jobs tool to automatically:
- Find all jobs with schedules but no installer assignments
- Analyze what trades each job needs (based on purchase orders)
- Find and assign the best available installers for each trade
- Populate the installer_assignments table with all assignments

This single tool call will handle the entire assignment process for all jobs.

STEP 3 - PROVIDE SUMMARY:
After the tool completes, provide a summary of:
- Total jobs scheduled
- Total installer assignments created
- The final state of all scheduled jobs with their assigned installers

Let the tools handle the work - they will automatically process all jobs and assignments for you.`;

    // Run the scheduling agent
    const result = await schedulingAgent.generate(prompt);

    logger.info(
      { result },
      'Autonomous job scheduling and installer assignment completed successfully'
    );

    return NextResponse.json({
      success: true,
      message: 'Job scheduling and installer assignment completed',
      schedulingResult: result,
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
