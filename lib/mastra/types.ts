/**
 * Type definitions for Mastra AI integration
 */

export interface SchedulingAgentInput {
  jobId: number;
}

export interface SchedulingResult {
  jobId: number;
  scheduledInstallers: Array<{
    installerId: number;
    scheduleId: number;
    assignmentId: number;
  }>;
  success: boolean;
  message: string;
}

export interface AgentToolContext {
  db: any; // Database connection
  logger: any; // Logger instance
}

export interface WebhookPayload {
  jobId: number;
}
