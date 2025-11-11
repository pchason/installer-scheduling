import { createTool } from '@mastra/core';
import { z } from 'zod';
import { db } from '@/lib/database/client';
import { jobs, purchaseOrders, installers, geographicLocations, jobSchedules, installerAssignments, installerLocations, schemaEmbeddings } from '@/lib/database/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { InferenceClient } from '@huggingface/inference';

/**
 * Tool: Get job with purchase orders
 * Retrieves a job and all associated purchase orders
 */
export const getJobWithPOs = createTool({
  id: 'get_job_with_pos',
  description: 'Retrieve a job and all its associated purchase orders',
  inputSchema: z.object({
    jobId: z.number().describe('The ID of the job to retrieve'),
  }),
  execute: async ({context}) => {
    const { jobId } = context;
    try {
      const jobData = await db.select().from(jobs).where(eq(jobs.jobId, jobId));
      const posData = await db.select().from(purchaseOrders).where(eq(purchaseOrders.jobId, jobId));

      if (jobData.length === 0) {
        return { error: `Job ${jobId} not found` };
      }

      return {
        job: jobData[0],
        purchaseOrders: posData,
      };
    } catch (error) {
      return { error: `Failed to retrieve job: ${error}` };
    }
  },
});

/**
 * Tool: Find available installers
 * Search for installers by trade, location, and date availability
 */
export const findAvailableInstallers = createTool({
  id: 'find_available_installers',
  description: 'Find installers available for a specific trade and location on a given date',
  inputSchema: z.object({
    trade: z.enum(['trim', 'stairs', 'doors']).describe('Type of installation work'),
    locationId: z.number().optional().describe('Geographic location ID'),
    date: z.string().describe('Date needed (YYYY-MM-DD format)'),
    limit: z.number().default(5).describe('Maximum number of installers to return'),
  }),
  execute: async ({context}) => {
    const { trade, locationId, date, limit } = context;
    try {
      let query = db
        .select()
        .from(installers)
        .where(and(eq(installers.trade, trade), eq(installers.isActive, true)));

      // If location specified, filter by location
      if (locationId) {
        const locInstallers = await db
          .select({ installerId: installers.installerId })
          .from(installers)
          .innerJoin(
            geographicLocations,
            eq(geographicLocations.locationId, locationId)
          );

        if (locInstallers.length === 0) {
          return { availableInstallers: [] };
        }
      }

      const result = await query.limit(limit);

      // Filter out already scheduled installers for that date
      const scheduled = await db
        .select({ installerId: installerAssignments.installerId })
        .from(installerAssignments)
        .innerJoin(jobSchedules, eq(jobSchedules.scheduleId, installerAssignments.scheduleId))
        .where(eq(jobSchedules.scheduledDate, date));

      const scheduledIds = new Set(scheduled.map(s => s.installerId));
      const available = result.filter(inst => !scheduledIds.has(inst.installerId));

      return { availableInstallers: available };
    } catch (error) {
      return { error: `Failed to find installers: ${error}` };
    }
  },
});

/**
 * Tool: Create job schedule
 * Create a schedule entry for a job on a specific date
 */
export const createJobSchedule = createTool({
  id: 'create_job_schedule',
  description: 'Create a job schedule entry for a specific date',
  inputSchema: z.object({
    jobId: z.number().describe('The job ID'),
    scheduledDate: z.string().describe('Date to schedule the job (YYYY-MM-DD format)'),
    notes: z.string().optional().describe('Optional notes about the schedule'),
  }),
  execute: async ({context}) => {
    const { jobId, scheduledDate, notes } = context;
    try {
      const result = await db
        .insert(jobSchedules)
        .values({
          jobId,
          scheduledDate,
          notes: notes || null,
          status: 'scheduled',
        })
        .returning();

      return { schedule: result[0] };
    } catch (error) {
      return { error: `Failed to create schedule: ${error}` };
    }
  },
});

/**
 * Tool: Assign installer to job
 * Create an assignment between an installer and a job schedule
 */
export const assignInstaller = createTool({
  id: 'assign_installer',
  description: 'Assign an installer to a job schedule for a purchase order',
  inputSchema: z.object({
    scheduleId: z.number().describe('The job schedule ID'),
    installerId: z.number().describe('The installer ID'),
    poId: z.number().describe('The purchase order ID'),
    notes: z.string().optional().describe('Optional notes about the assignment'),
  }),
  execute: async ({context}) => {
    const { scheduleId, installerId, poId, notes } = context;
    try {
      const result = await db
        .insert(installerAssignments)
        .values({
          scheduleId,
          installerId,
          poId,
          notes: notes || null,
          assignmentStatus: 'assigned',
        })
        .returning();

      return { assignment: result[0] };
    } catch (error) {
      return { error: `Failed to assign installer: ${error}` };
    }
  },
});

/**
 * Tool: Check installer location coverage
 * Determine if an installer serves the job location
 */
export const checkInstallerLocationCoverage = createTool({
  id: 'check_installer_location_coverage',
  description: 'Check if an installer serves a specific geographic location',
  inputSchema: z.object({
    installerId: z.number().describe('The installer ID'),
    locationId: z.number().describe('The geographic location ID'),
  }),
  execute: async ({context}) => {
    const { installerId, locationId } = context;
    try {
      const result = await db
        .select()
        .from(installers)
        .innerJoin(
          geographicLocations,
          eq(geographicLocations.locationId, locationId)
        )
        .where(eq(installers.installerId, installerId));

      return { servesLocation: result.length > 0 };
    } catch (error) {
      return { error: `Failed to check location coverage: ${error}` };
    }
  },
});

/**
 * Tool: Get installer details
 * Retrieve detailed information about an installer
 */
export const getInstallerDetails = createTool({
  id: 'get_installer_details',
  description: 'Get detailed information about an installer',
  inputSchema: z.object({
    installerId: z.number().describe('The installer ID'),
  }),
  execute: async ({context}) => {
    const { installerId } = context;
    try {
      const result = await db.select().from(installers).where(eq(installers.installerId, installerId));

      if (result.length === 0) {
        return { error: `Installer ${installerId} not found` };
      }

      return { installer: result[0] };
    } catch (error) {
      return { error: `Failed to get installer details: ${error}` };
    }
  },
});

/**
 * Tool: Find jobs without installers assigned
 * Retrieve all jobs that have no installer assignments
 */
export const findJobsWithoutInstallers = createTool({
  id: 'find_jobs_without_installers',
  description: 'Find all jobs that do not have any installers assigned to them',
  inputSchema: z.object({
    limit: z.number().default(10).describe('Maximum number of jobs to return'),
  }),
  execute: async ({context}) => {
    const { limit } = context;
    try {
      // Find jobs that have schedules but no assignments
      const unassignedJobs = await db
        .selectDistinct({
          jobId: jobs.jobId,
          jobNumber: jobs.jobNumber,
          streetAddress: jobs.streetAddress,
          city: jobs.city,
          state: jobs.state,
          status: jobs.status,
          locationId: jobs.locationId,
        })
        .from(jobs)
        .innerJoin(jobSchedules, eq(jobs.jobId, jobSchedules.jobId))
        .where(
          notInArray(
            jobSchedules.scheduleId,
            db
              .selectDistinct({ scheduleId: installerAssignments.scheduleId })
              .from(installerAssignments)
          )
        )
        .limit(limit);

      return { jobs: unassignedJobs };
    } catch (error) {
      return { error: `Failed to find unassigned jobs: ${error}` };
    }
  },
});

/**
 * Tool: Schedule jobs without schedules
 * Finds all jobs without schedules and creates schedules for each using their start_date and end_date
 */
export const scheduleJobsWithoutSchedules = createTool({
  id: 'schedule_jobs_without_schedules',
  description: 'Find all jobs without schedules and create schedules for each job using their start_date and end_date from the jobs table',
  inputSchema: z.object({
    limit: z.number().default(10).describe('Maximum number of jobs to schedule'),
  }),
  execute: async ({context}) => {
    const { limit } = context;
    try {
      // Find jobs that don't have any schedules
      const jobsWithoutSchedules = await db
        .selectDistinct({
          jobId: jobs.jobId,
          jobNumber: jobs.jobNumber,
          startDate: jobs.startDate,
          endDate: jobs.endDate,
          streetAddress: jobs.streetAddress,
          city: jobs.city,
          state: jobs.state,
        })
        .from(jobs)
        .where(
          notInArray(
            jobs.jobId,
            db
              .selectDistinct({ jobId: jobSchedules.jobId })
              .from(jobSchedules)
          )
        )
        .limit(limit);

      if (jobsWithoutSchedules.length === 0) {
        return { message: 'No jobs without schedules found', scheduledJobs: [] };
      }

      const scheduledJobs = [];

      // Create schedules for each job
      for (const job of jobsWithoutSchedules) {
        if (!job.startDate) {
          continue; // Skip jobs without a start_date
        }

        try {
          const scheduleResult = await db
            .insert(jobSchedules)
            .values({
              jobId: job.jobId,
              scheduledDate: job.startDate,
              notes: `Job scheduled from ${job.startDate} to ${job.endDate || job.startDate}`,
              status: 'scheduled',
            })
            .returning();

          if (scheduleResult && scheduleResult.length > 0) {
            // Update the job status to 'scheduled'
            await db
              .update(jobs)
              .set({ status: 'scheduled' })
              .where(eq(jobs.jobId, job.jobId));

            scheduledJobs.push({
              jobId: job.jobId,
              jobNumber: job.jobNumber,
              scheduleId: scheduleResult[0]?.scheduleId,
              startDate: job.startDate,
              endDate: job.endDate,
              address: `${job.streetAddress}, ${job.city}, ${job.state}`,
            });
          }
        } catch (jobError) {
          scheduledJobs.push({
            jobId: job.jobId,
            jobNumber: job.jobNumber,
            error: `Failed to schedule: ${jobError}`,
          });
        }
      }

      return {
        message: `Successfully scheduled ${scheduledJobs.filter((j) => !j.error).length} jobs`,
        scheduledJobs: scheduledJobs,
      };
    } catch (error) {
      return { error: `Failed to schedule jobs without schedules: ${error}` };
    }
  },
});

/**
 * Tool: Assign installers to all jobs with schedules but no assignments
 * Automatically finds and assigns the best-suited installers for each trade in each job
 */
export const assignInstallersToScheduledJobs = createTool({
  id: 'assign_installers_to_scheduled_jobs',
  description: 'Find all jobs with schedules but no installer assignments, analyze their trade needs, and automatically assign the best-suited installers',
  inputSchema: z.object({
    limit: z.number().default(10).describe('Maximum number of jobs to process'),
  }),
  execute: async ({context}) => {
    const { limit } = context;
    try {
      // Find jobs that have schedules but no assignments
      const jobsWithSchedulesNoAssignments = await db
        .selectDistinct({
          jobId: jobs.jobId,
          jobNumber: jobs.jobNumber,
          scheduleId: jobSchedules.scheduleId,
          scheduledDate: jobSchedules.scheduledDate,
          locationId: jobs.locationId,
        })
        .from(jobSchedules)
        .innerJoin(jobs, eq(jobs.jobId, jobSchedules.jobId))
        .where(
          notInArray(
            jobSchedules.scheduleId,
            db
              .selectDistinct({ scheduleId: installerAssignments.scheduleId })
              .from(installerAssignments)
          )
        )
        .limit(limit);

      if (jobsWithSchedulesNoAssignments.length === 0) {
        return { message: 'No jobs with schedules but no assignments found', assignments: [] };
      }

      const assignments = [];

      // Process each job
      for (const jobWithSchedule of jobsWithSchedulesNoAssignments) {
        try {
          // Get purchase orders for this job
          const pos = await db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.jobId, jobWithSchedule.jobId));

          if (pos.length === 0) continue;

          // Aggregate trade measurements across all POs for this job
          let totalTrimLinearFeet = 0;
          let totalStairRisers = 0;
          let totalDoorCount = 0;
          const poIdsByTrade: { [key in 'trim' | 'stairs' | 'doors']?: number[] } = {};

          for (const po of pos) {
            if (po.trimLinearFeet && parseFloat(po.trimLinearFeet.toString()) > 0) {
              totalTrimLinearFeet += parseFloat(po.trimLinearFeet.toString());
              if (!poIdsByTrade.trim) poIdsByTrade.trim = [];
              poIdsByTrade.trim.push(po.poId);
            }
            if (po.stairRisers && po.stairRisers > 0) {
              totalStairRisers += po.stairRisers;
              if (!poIdsByTrade.stairs) poIdsByTrade.stairs = [];
              poIdsByTrade.stairs.push(po.poId);
            }
            if (po.doorCount && po.doorCount > 0) {
              totalDoorCount += po.doorCount;
              if (!poIdsByTrade.doors) poIdsByTrade.doors = [];
              poIdsByTrade.doors.push(po.poId);
            }
          }

          // Determine trades needed and how many installers each needs (based on aggregated quantities)
          const tradesNeeded: Array<{ trade: 'trim' | 'stairs' | 'doors'; poIds: number[]; installersNeeded: number }> = [];

          if (totalTrimLinearFeet > 0) {
            // Assign 2 trim installers if trim > 400 linear feet, otherwise 1
            const trimInstallersNeeded = totalTrimLinearFeet > 400 ? 2 : 1;
            tradesNeeded.push({ trade: 'trim', poIds: poIdsByTrade.trim || [], installersNeeded: trimInstallersNeeded });
          }
          if (totalStairRisers > 0) {
            // Assign 2 stairs installers if risers > 25, otherwise 1
            const stairInstallersNeeded = totalStairRisers > 25 ? 2 : 1;
            tradesNeeded.push({ trade: 'stairs', poIds: poIdsByTrade.stairs || [], installersNeeded: stairInstallersNeeded });
          }
          if (totalDoorCount > 0) {
            // Assign 2 doors installers if door count > 15, otherwise 1
            const doorInstallersNeeded = totalDoorCount > 15 ? 2 : 1;
            tradesNeeded.push({ trade: 'doors', poIds: poIdsByTrade.doors || [], installersNeeded: doorInstallersNeeded });
          }

          // Assign installers for each needed trade
          for (const neededTrade of tradesNeeded) {
            // Assign the required number of installers for this trade
            for (let installerIndex = 0; installerIndex < neededTrade.installersNeeded; installerIndex++) {
              try {
                // Find available installers for this trade in the job's geographic location
                // Exclude installers already assigned to this trade on the same scheduled date
                const availableInstallers = await db
                  .selectDistinct({ installerId: installers.installerId, firstName: installers.firstName, lastName: installers.lastName })
                  .from(installers)
                  .innerJoin(installerLocations, eq(installers.installerId, installerLocations.installerId))
                  .where(
                    and(
                      eq(installers.trade, neededTrade.trade),
                      eq(installers.isActive, true),
                      jobWithSchedule.locationId ? eq(installerLocations.locationId, jobWithSchedule.locationId) : undefined,
                      notInArray(
                        installers.installerId,
                        db
                          .select({ installerId: installerAssignments.installerId })
                          .from(installerAssignments)
                          .innerJoin(jobSchedules, eq(installerAssignments.scheduleId, jobSchedules.scheduleId))
                          .innerJoin(purchaseOrders, eq(installerAssignments.poId, purchaseOrders.poId))
                          .innerJoin(installers as any, eq(installerAssignments.installerId, installers.installerId))
                          .where(
                            and(
                              eq(jobSchedules.scheduledDate, jobWithSchedule.scheduledDate),
                              // Only exclude installers of THIS trade on this date
                              eq(installers.trade, neededTrade.trade)
                            )
                          )
                      )
                    )
                  );

                if (availableInstallers.length === 0) {
                  assignments.push({
                    jobId: jobWithSchedule.jobId,
                    jobNumber: jobWithSchedule.jobNumber,
                    trade: neededTrade.trade,
                    poIds: neededTrade.poIds,
                    status: 'failed',
                    reason: `No available installers for this trade (installer ${installerIndex + 1} of ${neededTrade.installersNeeded})`,
                  });
                  continue;
                }

                // Assign to the first PO for this trade (all POs for a trade share the same installers)
                const primaryPoId = neededTrade.poIds[0];

                if (!primaryPoId) {
                  assignments.push({
                    jobId: jobWithSchedule.jobId,
                    jobNumber: jobWithSchedule.jobNumber,
                    trade: neededTrade.trade,
                    poIds: neededTrade.poIds,
                    status: 'failed',
                    reason: `No POs found for ${neededTrade.trade} trade`,
                  });
                  continue;
                }

                // Use round-robin selection: pick installer based on their ID modulo the total count
                // This distributes assignments evenly across available installers
                const roundRobinIndex = (primaryPoId + installerIndex) % availableInstallers.length;
                const selectedInstaller = availableInstallers[roundRobinIndex];

                if (!selectedInstaller) {
                  assignments.push({
                    jobId: jobWithSchedule.jobId,
                    jobNumber: jobWithSchedule.jobNumber,
                    trade: neededTrade.trade,
                    poIds: neededTrade.poIds,
                    status: 'failed',
                    reason: `No installers available without scheduling conflicts (installer ${installerIndex + 1} of ${neededTrade.installersNeeded})`,
                  });
                  continue;
                }

                const assignmentResult = await db
                  .insert(installerAssignments)
                  .values({
                    scheduleId: jobWithSchedule.scheduleId,
                    installerId: selectedInstaller.installerId,
                    poId: primaryPoId,
                    assignmentStatus: 'assigned',
                    notes: `Auto-assigned ${selectedInstaller.firstName} ${selectedInstaller.lastName} for ${neededTrade.trade} work (${installerIndex + 1} of ${neededTrade.installersNeeded})`,
                  })
                  .returning();

                if (assignmentResult && assignmentResult.length > 0) {
                  assignments.push({
                    jobId: jobWithSchedule.jobId,
                    jobNumber: jobWithSchedule.jobNumber,
                    scheduleId: jobWithSchedule.scheduleId,
                    trade: neededTrade.trade,
                    installerId: selectedInstaller.installerId,
                    installerName: `${selectedInstaller.firstName} ${selectedInstaller.lastName}`,
                    poId: primaryPoId,
                    status: 'assigned',
                  });
                }
              } catch (tradeError) {
                assignments.push({
                  jobId: jobWithSchedule.jobId,
                  jobNumber: jobWithSchedule.jobNumber,
                  trade: neededTrade.trade,
                  poIds: neededTrade.poIds,
                  status: 'failed',
                  reason: `Error assigning installer: ${tradeError}`,
                });
              }
            }
          }
        } catch (jobError) {
          assignments.push({
            jobId: jobWithSchedule.jobId,
            jobNumber: jobWithSchedule.jobNumber,
            status: 'failed',
            reason: `Error processing job: ${jobError}`,
          });
        }
      }

      const successCount = assignments.filter((a) => a.status === 'assigned').length;
      const failedCount = assignments.filter((a) => a.status === 'failed').length;

      return {
        message: `Assigned installers to ${successCount} positions, ${failedCount} positions could not be assigned`,
        totalAssignments: assignments.length,
        successfulAssignments: successCount,
        failedAssignments: failedCount,
        assignments: assignments,
      };
    } catch (error) {
      return { error: `Failed to assign installers to scheduled jobs: ${error}` };
    }
  },
});

/**
 * Tool: Retrieve relevant schema context using semantic search
 * Finds database schema information most relevant to the user's question
 */
export const retrieveSchemaContext = createTool({
  id: 'retrieve_schema_context',
  description: 'Find relevant database schema information based on a user question using semantic search',
  inputSchema: z.object({
    question: z.string().describe('The user question about the database'),
    limit: z.number().default(5).describe('Maximum number of schema results to return'),
  }),
  execute: async ({ context }) => {
    const { question, limit } = context;
    const hf = new InferenceClient(process.env.HF_API_TOKEN);

    try {
      // Generate embedding for the user's question
      const questionEmbedding = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: question,
      });

      // Retrieve all embeddings from the database
      const allEmbeddings = await db.select().from(schemaEmbeddings);

      if (allEmbeddings.length === 0) {
        return {
          error: 'No schema embeddings found. Please run schema embedding generation first.',
          schemaContext: [],
        };
      }

      // Calculate cosine similarity between question embedding and stored embeddings
      interface ScoredEmbedding {
        schemaKey: string;
        description: string;
        category: string;
        similarity: number;
      }

      const scored: ScoredEmbedding[] = allEmbeddings
        .map((stored) => {
          let storedEmbedding: number[] | undefined;
          try {
            storedEmbedding = JSON.parse(stored.embedding) as number[];
          } catch {
            storedEmbedding = undefined;
          }
          const similarity = cosineSimilarity(questionEmbedding as number[], storedEmbedding);
          return {
            schemaKey: stored.schemaKey,
            description: stored.description,
            category: stored.category,
            similarity,
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return {
        question,
        relevantSchema: scored.map((item) => ({
          key: item.schemaKey,
          description: item.description,
          category: item.category,
          relevanceScore: item.similarity.toFixed(3),
        })),
        totalResults: scored.length,
      };
    } catch (error) {
      return { error: `Failed to retrieve schema context: ${error}` };
    }
  },
});

/**
 * Tool: Execute a database query
 * Executes a SQL query and returns the results
 */
export const executeQuery = createTool({
  id: 'execute_query',
  description: 'Execute a database query and return the results',
  inputSchema: z.object({
    query: z.string().describe('The SQL query to execute'),
    description: z.string().describe('Natural language description of what this query does'),
  }),
  execute: async ({ context }) => {
    const { query, description } = context;
    try {
      // Note: This is a simplified version. In production, you'd want to:
      // 1. Validate the query for safety
      // 2. Use a parameterized query approach
      // 3. Add rate limiting and audit logging

      console.log(`Executing query: ${description}`);
      console.log(`SQL: ${query}`);

      const result = await db.execute(query as any);

      return {
        description,
        success: true,
        rowCount: (result as any)?.rowCount || 0,
        results: result,
      };
    } catch (error) {
      return {
        description,
        success: false,
        error: `Failed to execute query: ${error}`,
      };
    }
  },
});

/**
 * Helper function: Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[] | undefined, vecB: number[] | undefined): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if (a !== undefined && b !== undefined) {
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
