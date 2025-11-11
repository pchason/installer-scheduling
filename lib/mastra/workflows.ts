import { Workflow } from '@mastra/core';
import { z } from 'zod';
import { schedulingAgent } from './agents';

/**
 * Autonomous Scheduling Workflow
 * Triggered when a new job is created
 */
export const autonomousSchedulingWorkflow = new Workflow({
  id: 'autonomous-scheduling',
  description: 'Automatically schedule installers when a new job is created',
  inputSchema: z.object({
    jobId: z.number(),
  }),
  outputSchema: z.object({
    jobId: z.number(),
    agentResponse: z.any(),
    timestamp: z.string(),
  }),
  steps: [
    {
      id: 'analyze-and-schedule',
      description: 'Use the scheduling agent to analyze job and assign installers',
      inputSchema: z.object({
        jobId: z.number(),
      }),
      outputSchema: z.object({
        jobId: z.number(),
        agentResponse: z.any(),
        timestamp: z.string(),
      }),
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
        const result = await schedulingAgent.generate(prompt);

        return {
          jobId,
          agentResponse: result,
          timestamp: new Date().toISOString(),
        };
      },
    },
  ],
});
