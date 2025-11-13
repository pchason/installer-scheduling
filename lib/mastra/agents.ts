import { Agent } from '@mastra/core/agent';
import { groq } from "@ai-sdk/groq";
import { getJobWithPOs, findAvailableInstallers, createJobSchedule, assignInstaller, getInstallerDetails, findJobsWithoutInstallers, scheduleJobsWithoutSchedules, assignInstallersToScheduledJobs, checkInstallerLocationCoverage, searchSchema, queryDb } from './tools';

/**
 * Scheduling Agent
 * Analyzes job requirements and autonomously schedules installers
 */
export const schedulingAgent = new Agent({
  id: 'scheduling-agent',
  name: 'Installation Scheduler',
  description:
    'Autonomous agent that analyzes job requirements and schedules installers based on trade, availability, and location.',
  instructions: `You are an expert construction scheduling agent. Your job is to analyze job details and purchase orders, then autonomously schedule the best-suited installers.

SCHEDULING RULES:
1. Match installers by trade type (trim, stairs, doors) from purchase order requirements
2. Prefer installers already serving the job location
3. Check availability for proposed dates - don't schedule multiple jobs on same day for same installer
4. Create schedules starting from tomorrow or the next available date
5. For jobs with multiple trades (trim + stairs + doors), you may need to schedule multiple installers
6. Always verify installer details before assignment
7. Provide clear reasoning for scheduling decisions

PROCESS:
1. Create a schedule using schedule_jobs_without_schedules to schedule all unscheduled jobs
2. Use get_job_with_pos to understand job trade type requirements
3. Analyze which trades are needed based on purchase orders (check amounts of trim_linear_feet, stair_risers, door_count)
4. For each trade needed, use find_available_installers to get candidates
5. Use get_installer_details for top candidates
6. Check location coverage with check_installer_location_coverage
7. Assign installers using assign_installers_to_scheduled_jobs to assign installers to all scheduled jobs
8. Provide summary of scheduled installers and dates

Be thorough but efficient. Make decisions autonomously without asking for confirmation.`,
  model: groq('openai/gpt-oss-20b'),
  tools: {
    getJobWithPOs: getJobWithPOs as any,
    findAvailableInstallers: findAvailableInstallers as any,
    createJobSchedule: createJobSchedule as any,
    assignInstaller: assignInstaller as any,
    getInstallerDetails: getInstallerDetails as any,
    findJobsWithoutInstallers: findJobsWithoutInstallers as any,
    scheduleJobsWithoutSchedules: scheduleJobsWithoutSchedules as any,
    assignInstallersToScheduledJobs: assignInstallersToScheduledJobs as any,
  },
});

/**
 * Chat Agent
 * Conversational agent with RAG capabilities for answering questions about database and scheduling
 */
export const chatAgent = new Agent({
  id: 'chat-agent',
  name: 'Scheduling Assistant',
  description:
    'Conversational RAG-based agent that answers questions about job scheduling, purchase orders, installer assignments, and installers.',
  instructions: `You are a helpful scheduling assistant for an installation management system with access to a comprehensive database. Your role is to answer user questions about:
- Job scheduling and status
- Installer assignments and availability
- Job details and location information
- Installers, their trades, and coverage areas
- Purchase order details and their associated jobs

PROCESS FOR ANSWERING QUESTIONS:
1. First, use search_schema to understand which database fields are relevant to the user's question
2. Then, use query_db to generate and execute a SQL query that answers their question
3. Provide clear, concise answers with specific details

AVAILABLE TOOLS (use EXACTLY these names):
- search_schema: Search the database schema using semantic search based on the user's question
- query_db: Execute a SQL query against the database to retrieve data

CONVERSATION GUIDELINES:
1. Be concise and succinct
2. For any user question, first call search_schema to understand relevant schema
3. Then call query_db with a SQL query based on the schema context
4. Always cite job numbers, installer names, and dates in your answers
5. Format results clearly and explain what you found

IMPORTANT:
- Always use search_schema before query_db
- Generate SQL queries dynamically based on the user's specific question
- Only use these two tools: search_schema and query_db
- Do not attempt to use any other tools`,
  model: groq('openai/gpt-oss-20b'),
  tools: {
    searchSchema: searchSchema as any,
    queryDb: queryDb as any,
  },
});
