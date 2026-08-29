import { describe, it, expect, vi } from "vitest";
import { runScheduledSync } from "../src/lib/scheduler/index";
import { syncEngine } from "../src/lib/sync/engine";

describe("Automatic Scheduler Unit Tests", () => {
  it("runScheduledSync: delegates to syncEngine.syncAllUsers and returns summary", async () => {
    vi.spyOn(syncEngine, "syncAllUsers").mockResolvedValueOnce({
      totalUsers: 2,
      successCount: 2,
      failedCount: 0,
      results: [],
    });

    const result = await runScheduledSync();

    expect(result.queuedUsersCount).toBe(2);
    expect(result.errorsCount).toBe(0);
    expect(syncEngine.syncAllUsers).toHaveBeenCalledWith({ triggerType: "SCHEDULED" });
  });
});
