import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createGitHubAdapterForUser } from "@/lib/github/client";
import { CommitStrategy } from "@/lib/types/common";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repositoryConfig = await db.repositoryConfig.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    leetcodeUsername: user.leetcodeUsername || "",
    repositoryConfig,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      leetcodeUsername,
      repoOwner,
      repoName,
      branch,
      rootDir,
      folderStructure,
      commitStrategy,
      syncReadme,
      syncStats,
      autoSyncEnabled,
      syncFrequency,
    } = body;

    // 1. Update LeetCode username if provided
    if (typeof leetcodeUsername === "string") {
      await db.user.update({
        where: { id: user.id },
        data: { leetcodeUsername: leetcodeUsername.trim() },
      });
    }

    // 2. Verify repository access if changing owner/repo
    if (repoOwner && repoName) {
      try {
        const githubAdapter = await createGitHubAdapterForUser(user.id);
        const canWrite = await githubAdapter.verifyRepositoryAccess(repoOwner, repoName);
        if (!canWrite) {
          return NextResponse.json(
            {
              error: `Repository '${repoOwner}/${repoName}' was not found on GitHub or you do not have write access. Please make sure repository '${repoOwner}/${repoName}' exists on GitHub.`,
            },
            { status: 400 }
          );
        }
      } catch (err: any) {
        return NextResponse.json(
          {
            error: `Repository '${repoOwner}/${repoName}' was not found on GitHub. Please check your repository name.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Upsert RepositoryConfig
    const updatedConfig = await db.repositoryConfig.upsert({
      where: { userId: user.id },
      update: {
        ...(repoOwner && { repoOwner }),
        ...(repoName && { repoName }),
        ...(branch && { branch }),
        ...(rootDir && { rootDir }),
        ...(folderStructure && { folderStructure }),
        ...(commitStrategy && { commitStrategy: commitStrategy as CommitStrategy }),
        ...(typeof syncReadme === "boolean" && { syncReadme }),
        ...(typeof syncStats === "boolean" && { syncStats }),
        ...(typeof autoSyncEnabled === "boolean" && { autoSyncEnabled }),
        ...(syncFrequency && { syncFrequency }),
      },
      create: {
        userId: user.id,
        repoOwner: repoOwner || user.username,
        repoName: repoName || "leetcode-solutions",
        branch: branch || "main",
        rootDir: rootDir || "solutions",
        folderStructure: folderStructure || "{rootDir}/{difficulty}/{problem-slug}",
        commitStrategy: (commitStrategy as CommitStrategy) || "BATCH",
        syncReadme: syncReadme ?? true,
        syncStats: syncStats ?? true,
        autoSyncEnabled: autoSyncEnabled ?? true,
        syncFrequency: syncFrequency || "DAILY",
      },
    });

    return NextResponse.json({
      message: "Settings updated successfully",
      repositoryConfig: updatedConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
