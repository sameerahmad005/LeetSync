import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createGitHubAdapterForUser } from "@/lib/github/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  try {
    const githubAdapter = await createGitHubAdapterForUser(user.id);

    // If owner & repo provided, fetch branches for that repo
    if (owner && repo) {
      const branches = await githubAdapter.listBranches(owner, repo);
      return NextResponse.json({ branches });
    }

    // Otherwise list user's repositories
    const repositories = await githubAdapter.listRepositories();
    return NextResponse.json({ repositories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch repositories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, isPrivate, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Repository name is required." }, { status: 400 });
    }

    const repoName = name.trim().replace(/\s+/g, "-");

    // 1. Create repository on GitHub via Octokit
    const githubAdapter = await createGitHubAdapterForUser(user.id);
    const repository = await githubAdapter.createRepository(
      repoName,
      description || "LeetCode solutions synced automatically with LeetSync",
      Boolean(isPrivate)
    );

    // 2. Automatically update user's repository config to target this new repository
    await db.repositoryConfig.upsert({
      where: { userId: user.id },
      update: {
        repoOwner: repository.owner,
        repoName: repository.name,
        branch: repository.defaultBranch || "main",
      },
      create: {
        userId: user.id,
        repoOwner: repository.owner,
        repoName: repository.name,
        branch: repository.defaultBranch || "main",
        rootDir: "solutions",
      },
    });

    return NextResponse.json({
      message: `Repository '${repository.fullName}' created on GitHub and set as target repository!`,
      repository,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create repository on GitHub" },
      { status: 500 }
    );
  }
}
