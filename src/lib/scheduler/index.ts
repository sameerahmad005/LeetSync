import { db } from "@/lib/db";
import { syncEngine } from "@/lib/sync/engine";

export async function runScheduledSync(): Promise<{ queuedUsersCount: number; errorsCount: number }> {
  console.log("[Scheduler] Running daily scheduled synchronization check...");

  try {
    const summary = await syncEngine.syncAllUsers({
      triggerType: "SCHEDULED",
    });

    console.log(`[Scheduler] Daily sync completed. Total users: ${summary.totalUsers}, Success: ${summary.successCount}, Failed: ${summary.failedCount}`);
    return { queuedUsersCount: summary.successCount, errorsCount: summary.failedCount };
  } catch (err: any) {
    console.error("[Scheduler] Scheduled sync error:", err.message);
    return { queuedUsersCount: 0, errorsCount: 1 };
  }
}

// Standalone execution if invoked directly
if (require.main === module) {
  runScheduledSync()
    .then((result) => {
      console.log(`[Scheduler] Completed scheduled sync run. Processed: ${result.queuedUsersCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Scheduler] Fatal error during scheduled sync:", err);
      process.exit(1);
    });
}
