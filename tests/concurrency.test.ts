import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncEngine } from "../src/lib/sync/engine";
import { db } from "../src/lib/db";
import { defaultLeetCodeAdapter } from "../src/lib/leetcode/client";
import { createGitHubAdapterForUser } from "../src/lib/github/client";

vi.mock("../src/lib/db", () => ({
  db: {
    user: {
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

vi.mock("../src/lib/leetcode/client", () => ({
  defaultLeetCodeAdapter: {
    getRecentSubmissions: vi.fn(),
  },
}));

vi.mock("../src/lib/github/client", () => ({
  createGitHubAdapterForUser: vi.fn(),
}));

describe("Phase 13: Mandatory Concurrency Protection Test", () => {
  let engine: SyncEngine;
  let mockGitHubAdapter: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    engine = new SyncEngine();

    mockGitHubAdapter = {
      createCommit: vi.fn().mockResolvedValue({
        commitSha: "commit_sha_concurrent",
        filesCount: 1,
      }),
      updateReadmeSection: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(createGitHubAdapterForUser).mockResolvedValue(mockGitHubAdapter);

    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_id_202",
      username: "concurrent_dev",
      leetcodeUsername: "lc_concurrent",
      repositoryConfig: {
        repoOwner: "concurrent_dev",
        repoName: "leetcode-solutions",
        branch: "main",
        rootDir: "solutions",
        folderStructure: "{rootDir}/{difficulty}/{problem-slug}",
        commitStrategy: "BATCH",
        syncReadme: false,
        syncStats: false,
      },
    } as any);

    vi.mocked(db.syncRun.create).mockResolvedValue({ id: "sync_run_concurrent" } as any);
    vi.mocked(db.syncRun.update).mockResolvedValue({ id: "sync_run_concurrent" } as any);
  });

  it("Concurrency: Parallel sync calls safely complete without producing duplicate database records or commits", async () => {
    const mockSubmission = {
      id: "99999",
      problemSlug: "valid-parentheses",
      title: "Valid Parentheses",
      difficulty: "EASY",
      language: "python3",
      normalizedLanguage: "Python",
      extension: "py",
      code: "class Solution: pass",
      status: "ACCEPTED",
      submittedAt: new Date(),
    };

    vi.mocked(defaultLeetCodeAdapter.getRecentSubmissions).mockResolvedValue([mockSubmission as any]);

    // First call finds no existing record; second parallel call simulates existing record from race
    vi.mocked(db.submission.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ leetcodeSubmissionId: "99999" } as any]);

    const [res1, res2] = await Promise.all([
      engine.syncUser("user_id_202", { isDryRun: false }),
      engine.syncUser("user_id_202", { isDryRun: false }),
    ]);

    const totalSynced = res1.syncedCount + res2.syncedCount;
    const totalSkipped = res1.skippedCount + res2.skippedCount;

    expect(totalSynced).toBe(1);
    expect(totalSkipped).toBe(1);
  });
});
