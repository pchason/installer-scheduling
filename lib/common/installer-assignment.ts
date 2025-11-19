import { db } from '@/lib/database/client';
import { jobs, purchaseOrders, installers, jobSchedules, installerAssignments, installerLocations } from '@/lib/database/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

/**
 * Core business logic for assigning installers to scheduled jobs
 * Finds jobs with schedules but no assignments, analyzes their trade needs,
 * and automatically assigns the best-suited installers for each trade
 */
export async function assignInstallersToScheduledJobsLogic(limit: number = 10) {
  try {
    logger.info('=== STARTING INSTALLER ASSIGNMENT LOGIC ===');

    // Find jobs that have schedules but no assignments
    logger.info(`Looking for jobs with schedules but no assignments (limit: ${limit})`);
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

    logger.info(
      {
        jobs: jobsWithSchedulesNoAssignments,
      },
      `Found ${jobsWithSchedulesNoAssignments.length} jobs with schedules but no assignments`
    );

    if (jobsWithSchedulesNoAssignments.length === 0) {
      logger.warn('No jobs with schedules but no assignments found');
      return { message: 'No jobs with schedules but no assignments found', assignments: [] };
    }

    const assignments = [];

    // Process each job
    for (const jobWithSchedule of jobsWithSchedulesNoAssignments) {
      try {
        logger.info(`Processing job ${jobWithSchedule.jobNumber} (ID: ${jobWithSchedule.jobId}, LocationId: ${jobWithSchedule.locationId})`);

        // Get purchase orders for this job
        const pos = await db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.jobId, jobWithSchedule.jobId));

        logger.info({ pos }, `Found ${pos.length} purchase orders for job ${jobWithSchedule.jobNumber}`);

        if (pos.length === 0) {
          logger.warn(`No purchase orders found for job ${jobWithSchedule.jobNumber}, skipping`);
          continue;
        }

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

        logger.info(`Aggregated trades for job ${jobWithSchedule.jobNumber}: trim=${totalTrimLinearFeet} ft, stairs=${totalStairRisers} risers, doors=${totalDoorCount}`);

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

        logger.info(`Trades needed for job ${jobWithSchedule.jobNumber}: ${tradesNeeded.map((t) => `${t.trade}(${t.installersNeeded})`).join(', ')}`);

        if (tradesNeeded.length === 0) {
          logger.warn(`No trades needed for job ${jobWithSchedule.jobNumber}, skipping assignment`);
          continue;
        }

        // Assign installers for each needed trade
        for (const neededTrade of tradesNeeded) {
          logger.info(`Looking for installers for trade: ${neededTrade.trade} (need ${neededTrade.installersNeeded})`);

          // Assign the required number of installers for this trade
          for (let installerIndex = 0; installerIndex < neededTrade.installersNeeded; installerIndex++) {
            try {
              logger.info(`Finding available installer ${installerIndex + 1} of ${neededTrade.installersNeeded} for ${neededTrade.trade}`);

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

              logger.info({ availableInstallers }, `Found ${availableInstallers.length} available installers for ${neededTrade.trade}`);

              if (availableInstallers.length === 0) {
                logger.warn(`No available installers for trade ${neededTrade.trade} (installer ${installerIndex + 1} of ${neededTrade.installersNeeded})`);
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

              logger.info(`Assigning ${selectedInstaller.firstName} ${selectedInstaller.lastName} (ID: ${selectedInstaller.installerId}) to job ${jobWithSchedule.jobNumber} for ${neededTrade.trade}`);

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
                logger.info({ assignment: assignmentResult[0] }, `Successfully assigned installer to job ${jobWithSchedule.jobNumber}`);
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
              logger.error(`Error assigning installer for ${neededTrade.trade} to job ${jobWithSchedule.jobNumber}: ${tradeError}`);
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
        logger.error(`Error processing job ${jobWithSchedule.jobNumber}: ${jobError}`);
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

    logger.info(
      {
        successCount,
        failedCount,
        totalAssignments: assignments.length,
      },
      '=== INSTALLER ASSIGNMENT COMPLETE ==='
    );

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
}
