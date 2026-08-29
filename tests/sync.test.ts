import { describe, it, expect, vi } from "vitest";
import { generateFilePath, generateProblemReadmePath } from "../src/lib/sync/path";
import { generateProblemReadme, generateStatsMarkdown } from "../src/lib/sync/templates";
import { syncEngine } from "../src/lib/sync/engine";
import { db } from "../src/lib/db";

vi.mock("../src/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    syncRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    submission: {
      findMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    syncItem: {
      create: vi.fn(),
    },
  },
}));

describe("Synchronization Engine Unit Tests", () => {
  describe("File Path Generator", () => {
    it("generateFilePath: creates normalized Unix paths using template parameters", () => {
      const path = generateFilePath({
        rootDir: "solutions",
        difficulty: "EASY",
        problemSlug: "two-sum",
        extension: "cpp",
      });

      expect(path).toBe("solutions/easy/two-sum/solution.cpp");
    });

    it("generateFilePath: prevents path traversal in custom folder structures", () => {
      const path = generateFilePath({
        rootDir: "solutions",
        difficulty: "easy",
        problemSlug: "../../etc/passwd",
        extension: "py",
      });

      expect(path).toBe("solutions/easy/etc-passwd/solution.py");
      expect(path).not.toContain("..");
    });

    it("generateProblemReadmePath: derives README path in same directory as solution file", () => {
      const readmePath = generateProblemReadmePath("solutions/medium/3sum/solution.ts");
      expect(readmePath).toBe("solutions/medium/3sum/README.md");
    });
  });

  describe("README Templates", () => {
    it("generateProblemReadme: formats problem markdown cleanly without inventing complexity", () => {
      const readme = generateProblemReadme({
        title: "Two Sum",
        problemSlug: "two-sum",
        difficulty: "EASY",
        language: "C++",
        submittedAt: new Date("2026-08-28T00:00:00Z"),
      });

      expect(readme).toContain("# Two Sum");
      expect(readme).toContain("**Difficulty:** Easy");
      expect(readme).toContain("**Language:** C++");
      expect(readme).toContain("https://leetcode.com/problems/two-sum/");
      expect(readme).not.toContain("Complexity Analysis");
    });

    it("generateStatsMarkdown: creates progress table markdown", () => {
      const stats = generateStatsMarkdown({
        easyCount: 15,
        mediumCount: 10,
        hardCount: 2,
        languageCounts: { "C++": 20, Python: 7 },
      });

      expect(stats).toContain("## 📊 LeetCode Progress");
      expect(stats).toContain("🟢 **Easy** | 15");
      expect(stats).toContain("🔴 **Hard** | 2");
      expect(stats).toContain("🏆 **Total** | **27**");
      expect(stats).toContain("C++ | 20");
    });
  });

  describe("syncAllUsers", () => {
    it("syncAllUsers: processes active users and returns execution summary", async () => {
      vi.mocked(db.user.findMany).mockResolvedValueOnce([
        {
          id: "u1",
          username: "alice",
          repositoryConfig: { autoSyncEnabled: true },
        } as any,
      ]);

      vi.spyOn(syncEngine, "syncUser").mockResolvedValueOnce({
        syncRunId: "run_1",
        status: "COMPLETED",
        isDryRun: false,
        detectedCount: 2,
        syncedCount: 1,
        skippedCount: 1,
        failedCount: 0,
      });

      const summary = await syncEngine.syncAllUsers();
      expect(summary.totalUsers).toBe(1);
      expect(summary.successCount).toBe(1);
      expect(summary.failedCount).toBe(0);
    });
  });
});
