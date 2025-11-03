import { createTool } from '@mastra/core';
import { z } from 'zod';
import { db } from '@/lib/database/client';
import { jobs, purchaseOrders, installers, geographicLocations, jobSchedules, installerAssignments } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

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
