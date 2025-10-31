import { Workflow } from '@mastra/core';
import { schedulingAgent } from './agents';

/**
 * Autonomous Scheduling Workflow
 * Triggered when a new job is created
 */
export const autonomousSchedulingWorkflow = new Workflow({
  id: 'autonomous-scheduling',
  name: 'Autonomous Job Scheduling',
  description: 'Automatically schedule installers when a new job is created',
  triggers: {
    webhook: {
      path: '/webhooks/job-created',
    },
  },
  steps: {
    analyzeAndSchedule: {
      id: 'analyze-and-schedule',
      description: 'Use the scheduling agent to analyze job and assign installers',
      execute: async (context: any) => {
        const { jobId } = context.trigger.data;

        if (!jobId) {
          throw new Error('Job ID is required');
        }

        // Create the prompt for the agent
        const prompt = `A new job (ID: ${jobId}) has been created in the system.

Please analyze this job and its purchase orders, then schedule the appropriate installers.

Steps:
1. Retrieve the job details and all purchase orders
2. Determine what trades are needed based on the PO quantities
3. Find available installers for each needed trade
4. Create schedules and assign installers
5. Provide a summary of what was scheduled`;

        // Run the agent
        const result = await schedulingAgent.run(prompt);

        return {
          jobId,
          agentResponse: result,
          timestamp: new Date().toISOString(),
        };
      },
    },
  },
});
