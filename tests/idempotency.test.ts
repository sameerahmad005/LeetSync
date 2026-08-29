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

describe("Phase 13: Mandatory Idempotency & Duplicate Prevention Test", () => {
  let engine: SyncEngine;
  let mockGitHubAdapter: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    engine = new SyncEngine();

    mockGitHubAdapter = {
      createCommit: vi.fn().mockResolvedValue({
        commitSha: "commit_sha_12345",
        commitUrl: "https://github.com/user/repo/commit/commit_sha_12345",
        filesCount: 1,
      }),
      updateReadmeSection: vi.fn().mockResolvedValue(null),
    };

    vi.mocked(createGitHubAdapterForUser).mockResolvedValue(mockGitHubAdapter);

    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_id_101",
      username: "testuser",
      leetcodeUsername: "lc_testuser",
      repositoryConfig: {
        repoOwner: "testuser",
        repoName: "leetcode-solutions",
        branch: "main",
        rootDir: "solutions",
        folderStructure: "{rootDir}/{difficulty}/{problem-slug}",
        commitStrategy: "BATCH",
        syncReadme: false,
        syncStats: false,
      },
    } as any);

    vi.mocked(db.syncRun.create).mockResolvedValue({ id: "sync_run_id_1" } as any);
    vi.mocked(db.syncRun.update).mockResolvedValue({ id: "sync_run_id_1" } as any);
  });

  it("Idempotency: Submission 12345 synced on 1st run; 2nd run detects duplicate and SKIPS commit", async () => {
    const mockSubmission = {
      id: "12345",
      problemSlug: "two-sum",
      title: "Two Sum",
      difficulty: "EASY",
      language: "cpp",
      normalizedLanguage: "C++",
      extension: "cpp",
      code: "int main() {}",
      status: "ACCEPTED",
      submittedAt: new Date(),
    };

    vi.mocked(defaultLeetCodeAdapter.getRecentSubmissions).mockResolvedValue([mockSubmission as any]);

    // First Run: Submission 12345 does NOT exist in DB
    vi.mocked(db.submission.findMany).mockResolvedValueOnce([]);

    const resultRun1 = await engine.syncUser("user_id_101", { isDryRun: false });

    expect(resultRun1.detectedCount).toBe(1);
    expect(resultRun1.syncedCount).toBe(1);
    expect(resultRun1.skippedCount).toBe(0);
    expect(mockGitHubAdapter.createCommit).toHaveBeenCalledTimes(1);

    // Second Run: Submission 12345 ALREADY exists in DB
    vi.mocked(db.submission.findMany).mockResolvedValueOnce([{ leetcodeSubmissionId: "12345" } as any]);

    const resultRun2 = await engine.syncUser("user_id_101", { isDryRun: false });

    expect(resultRun2.detectedCount).toBe(1);
    expect(resultRun2.syncedCount).toBe(0);
    expect(resultRun2.skippedCount).toBe(1);
    // Verified: No 2nd GitHub commit created!
    expect(mockGitHubAdapter.createCommit).toHaveBeenCalledTimes(1);
  });
});
