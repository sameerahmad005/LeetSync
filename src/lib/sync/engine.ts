import { db } from "@/lib/db";
import { defaultLeetCodeAdapter } from "@/lib/leetcode/client";
import { createGitHubAdapterForUser } from "@/lib/github/client";
import { generateFilePath, generateProblemReadmePath } from "./path";
import { generateProblemReadme, generateStatsMarkdown } from "./templates";
import { SyncOptions, SyncResult, SyncDryRunResultItem } from "./types";
import { UserNotConfiguredError } from "./errors";
import { Difficulty } from "@/lib/types/common";

export class SyncEngine {
  async syncUser(userId: string, options: SyncOptions = {}): Promise<SyncResult> {
    const isDryRun = options.isDryRun ?? false;

    // 1. Fetch user & configuration
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { repositoryConfig: true },
    });

    if (!user || !user.leetcodeUsername) {
      throw new UserNotConfiguredError("LeetCode username is not configured.");
    }

    const repoConfig = user.repositoryConfig;
    if (!repoConfig || !repoConfig.repoOwner || !repoConfig.repoName) {
      throw new UserNotConfiguredError("GitHub repository is not configured.");
    }

    // 2. Create SyncRun record in database
    const syncRun = await db.syncRun.create({
      data: {
        userId,
        triggerType: options.triggerType || "MANUAL",
        status: "PROCESSING",
        isDryRun,
      },
    });

    try {
      // 3. Fetch recent accepted submissions from LeetCode
      const recentSubmissions = await defaultLeetCodeAdapter.getRecentSubmissions(user.leetcodeUsername);
      const acceptedSubmissions = recentSubmissions.filter((s) => s.status === "ACCEPTED");

      // 4. Query existing synchronized submissions for idempotency check
      const existingSubmissions = await db.submission.findMany({
        where: {
          userId,
          leetcodeSubmissionId: { in: acceptedSubmissions.map((s) => s.id) },
        },
        select: { leetcodeSubmissionId: true },
      });

      const existingSet = new Set(existingSubmissions.map((s) => s.leetcodeSubmissionId));

      const newSubmissions = acceptedSubmissions.filter((s) => !existingSet.has(s.id));
      const skippedCount = acceptedSubmissions.length - newSubmissions.length;

      // Handle Dry-Run Mode
      if (isDryRun) {
        const previewItems: SyncDryRunResultItem[] = acceptedSubmissions.map((sub) => {
          const isAlreadySynced = existingSet.has(sub.id);
          const targetPath = generateFilePath({
            rootDir: repoConfig.rootDir,
            difficulty: sub.difficulty,
            problemSlug: sub.problemSlug,
            extension: sub.extension,
            folderStructure: repoConfig.folderStructure,
          });

          return {
            submissionId: sub.id,
            problemSlug: sub.problemSlug,
            title: sub.title,
            difficulty: sub.difficulty,
            language: sub.normalizedLanguage,
            status: isAlreadySynced ? "ALREADY_SYNCED" : "NEW",
            targetPath,
          };
        });

        await db.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            detectedCount: acceptedSubmissions.length,
            syncedCount: 0,
            skippedCount: acceptedSubmissions.length,
          },
        });

        return {
          syncRunId: syncRun.id,
          status: "COMPLETED",
          isDryRun: true,
          detectedCount: acceptedSubmissions.length,
          syncedCount: 0,
          skippedCount: acceptedSubmissions.length,
          failedCount: 0,
          previewItems,
        };
      }

      // If no new submissions to sync, finish early
      if (newSubmissions.length === 0) {
        await db.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            detectedCount: acceptedSubmissions.length,
            syncedCount: 0,
            skippedCount,
          },
        });

        return {
          syncRunId: syncRun.id,
          status: "COMPLETED",
          isDryRun: false,
          detectedCount: acceptedSubmissions.length,
          syncedCount: 0,
          skippedCount,
          failedCount: 0,
        };
      }

      // 5. Fetch full submission code for each new submission
      const githubAdapter = await createGitHubAdapterForUser(userId);

      const filesToCommit: Array<{ path: string; content: string }> = [];
      const pendingSubmissionsToSave: Array<{
        sub: any;
        solutionPath: string;
        readmePath?: string;
      }> = [];

      for (const sub of newSubmissions) {
        let code = sub.code;
        if (!code) {
          const details = await defaultLeetCodeAdapter.getSubmissionDetails(user.leetcodeUsername, sub.id);
          code = details?.code || `// Solution for ${sub.title}`;
        }
        sub.code = code || `// Solution for ${sub.title}`;

        const solutionPath = generateFilePath({
          rootDir: repoConfig.rootDir,
          difficulty: sub.difficulty,
          problemSlug: sub.problemSlug,
          extension: sub.extension,
          folderStructure: repoConfig.folderStructure,
        });

        filesToCommit.push({ path: solutionPath, content: sub.code });

        let readmePath: string | undefined;
        if (repoConfig.syncReadme) {
          readmePath = generateProblemReadmePath(solutionPath);
          const readmeContent = generateProblemReadme({
            title: sub.title,
            problemSlug: sub.problemSlug,
            difficulty: sub.difficulty,
            language: sub.normalizedLanguage,
            submittedAt: sub.submittedAt,
            leetcodeUsername: user.leetcodeUsername,
          });
          filesToCommit.push({ path: readmePath, content: readmeContent });
        }

        pendingSubmissionsToSave.push({ sub, solutionPath, readmePath });
      }

      // 6. Commit to GitHub (BATCH by default vs INDIVIDUAL per setting)
      let commitResult;
      const commitMessage =
        newSubmissions.length === 1
          ? `Sync LeetCode solution: ${newSubmissions[0].title}`
          : `Sync ${newSubmissions.length} LeetCode solutions - ${new Date().toISOString().split("T")[0]}`;

      if (repoConfig.commitStrategy === "INDIVIDUAL" && newSubmissions.length > 1) {
        for (const item of pendingSubmissionsToSave) {
          const singleFiles = filesToCommit.filter(
            (f) => f.path === item.solutionPath || (item.readmePath && f.path === item.readmePath)
          );
          commitResult = await githubAdapter.createCommit(
            repoConfig.repoOwner,
            repoConfig.repoName,
            repoConfig.branch,
            singleFiles,
            `Sync LeetCode solution: ${item.sub.title}`
          );
        }
      } else {
        commitResult = await githubAdapter.createCommit(
          repoConfig.repoOwner,
          repoConfig.repoName,
          repoConfig.branch,
          filesToCommit,
          commitMessage
        );
      }

      // 7. Save submissions & SyncItems into Database
      let syncedCount = 0;
      for (const item of pendingSubmissionsToSave) {
        try {
          const savedSub = await db.submission.create({
            data: {
              userId,
              leetcodeSubmissionId: item.sub.id,
              problemSlug: item.sub.problemSlug,
              title: item.sub.title,
              difficulty: item.sub.difficulty as Difficulty,
              language: item.sub.language,
              normalizedLanguage: item.sub.normalizedLanguage,
              code: item.sub.code,
              status: item.sub.status,
              submittedAt: item.sub.submittedAt,
            },
          });

          await db.syncItem.create({
            data: {
              syncRunId: syncRun.id,
              submissionId: savedSub.id,
              problemSlug: item.sub.problemSlug,
              title: item.sub.title,
              difficulty: item.sub.difficulty as Difficulty,
              language: item.sub.normalizedLanguage,
              status: "SYNCED",
              githubPath: item.solutionPath,
              githubCommitSha: commitResult?.commitSha,
            },
          });

          syncedCount++;
        } catch {
          // Idempotency: Ignore duplicate insertion error
          syncedCount++;
        }
      }

      // 8. Update Repository Statistics README if enabled
      if (repoConfig.syncStats) {
        const stats = await db.submission.groupBy({
          by: ["difficulty"],
          where: { userId },
          _count: { _all: true },
        });

        const langStats = await db.submission.groupBy({
          by: ["normalizedLanguage"],
          where: { userId },
          _count: { _all: true },
        });

        const easyCount = stats.find((s) => s.difficulty === "EASY")?._count._all || 0;
        const mediumCount = stats.find((s) => s.difficulty === "MEDIUM")?._count._all || 0;
        const hardCount = stats.find((s) => s.difficulty === "HARD")?._count._all || 0;

        const languageCounts: Record<string, number> = {};
        for (const l of langStats) {
          languageCounts[l.normalizedLanguage] = l._count._all;
        }

        const statsMarkdown = generateStatsMarkdown({
          easyCount,
          mediumCount,
          hardCount,
          languageCounts,
          leetcodeUsername: user.leetcodeUsername,
        });

        await githubAdapter.updateReadmeSection(
          repoConfig.repoOwner,
          repoConfig.repoName,
          repoConfig.branch,
          statsMarkdown
        );
      }

      // 9. Update SyncRun record to COMPLETED
      await db.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          detectedCount: acceptedSubmissions.length,
          syncedCount,
          skippedCount,
        },
      });

      return {
        syncRunId: syncRun.id,
        status: "COMPLETED",
        isDryRun: false,
        detectedCount: acceptedSubmissions.length,
        syncedCount,
        skippedCount,
        failedCount: 0,
      };
    } catch (err: any) {
      await db.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: err.message || "Synchronization failed",
        },
      });

      throw err;
    }
  }

  async syncAllUsers(options: SyncOptions = {}): Promise<{
    totalUsers: number;
    successCount: number;
    failedCount: number;
    results: Array<{ userId: string; username: string; result?: SyncResult; error?: string }>;
  }> {
    const users = await db.user.findMany({
      where: {
        leetcodeUsername: { not: null },
        repositoryConfig: { isNot: null },
      },
      select: {
        id: true,
        username: true,
        repositoryConfig: {
          select: { autoSyncEnabled: true },
        },
      },
    });

    // Filter users with automatic sync enabled (unless options override)
    const activeUsers = users.filter(
      (u) => options.ignoreAutoSyncFlag || u.repositoryConfig?.autoSyncEnabled
    );

    let successCount = 0;
    let failedCount = 0;
    const results: Array<{ userId: string; username: string; result?: SyncResult; error?: string }> = [];

    for (const u of activeUsers) {
      try {
        const result = await this.syncUser(u.id, {
          ...options,
          triggerType: options.triggerType || "SCHEDULED",
        });
        successCount++;
        results.push({ userId: u.id, username: u.username, result });
      } catch (err: any) {
        failedCount++;
        results.push({ userId: u.id, username: u.username, error: err.message || "Sync failed" });
      }
    }

    return {
      totalUsers: activeUsers.length,
      successCount,
      failedCount,
      results,
    };
  }
}

export const syncEngine = new SyncEngine();
