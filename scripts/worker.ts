import { prisma } from "../src/lib/prisma";
import { releaseExpiredReservations } from "../src/services/reservation.service";
import { processNotificationOutbox } from "../src/services/notification.service";
import { sweepSaaSSubscriptions } from "../src/services/saas/subscription.service";
import { logger } from "../src/lib/logger";

interface WorkerRunStats {
  reservationsRecovered: number;
  notificationsProcessed: number;
  notificationsSucceeded: number;
  notificationsFailed: number;
  expiredTrials: number;
  cancelledSubscriptions: number;
  pastDueSubscriptions: number;
  durationMs: number;
}

let isRunning = false;
let shouldStop = false;

/**
 * Executes a single complete cycle across all durable background jobs.
 */
export async function runWorkerCycle(): Promise<WorkerRunStats> {
  const startTime = Date.now();

  // 1. Recover expired inventory stock reservations
  const reservationResult = await releaseExpiredReservations();

  // 2. Dispatch pending notification outbox items
  const outboxResult = await processNotificationOutbox(50);

  // 3. Process SaaS subscription state transitions
  const saasResult = await sweepSaaSSubscriptions();

  const durationMs = Date.now() - startTime;

  return {
    reservationsRecovered: reservationResult.expiredCount,
    notificationsProcessed: outboxResult.processed,
    notificationsSucceeded: outboxResult.succeeded,
    notificationsFailed: outboxResult.failed,
    expiredTrials: saasResult.expiredTrials,
    cancelledSubscriptions: saasResult.cancelledSubscriptions,
    pastDueSubscriptions: saasResult.pastDueSubscriptions,
    durationMs,
  };
}

/**
 * Main worker execution loop for persistent container execution.
 */
async function startWorkerLoop() {
  const pollIntervalMs = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "15000", 10);
  const isOneShot = process.argv.includes("--once");

  logger.info("NEXORA Background Worker starting...", {
    pollIntervalMs,
    isOneShot,
    nodeEnv: process.env.NODE_ENV,
  });

  const stopSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const sig of stopSignals) {
    process.on(sig, async () => {
      logger.info(`Received ${sig}. Initiating graceful worker shutdown...`);
      shouldStop = true;
      if (!isRunning) {
        await prisma.$disconnect();
        process.exit(0);
      }
    });
  }

  do {
    isRunning = true;
    try {
      const stats = await runWorkerCycle();
      const hasWork =
        stats.reservationsRecovered > 0 ||
        stats.notificationsProcessed > 0 ||
        stats.expiredTrials > 0 ||
        stats.cancelledSubscriptions > 0 ||
        stats.pastDueSubscriptions > 0;

      if (hasWork) {
        logger.info("Worker completed sweep with actions taken", { stats });
      } else {
        logger.debug("Worker idle cycle clean", { durationMs: stats.durationMs });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("Background worker tick encountered unhandled error", { error: errorMsg });
    } finally {
      isRunning = false;
    }

    if (isOneShot) {
      break;
    }

    if (!shouldStop) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  } while (!shouldStop);

  logger.info("NEXORA Background Worker stopped cleanly.");
  await prisma.$disconnect();
}

if (require.main === module) {
  startWorkerLoop().catch(async (e) => {
    logger.error("Fatal background worker failure", { error: e.message });
    await prisma.$disconnect();
    process.exit(1);
  });
}
