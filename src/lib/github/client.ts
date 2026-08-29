import { db } from "@/lib/db";
import { OctokitGitHubAdapter } from "./adapter";
import { GitHubAdapter } from "./types";
import { GitHubUnauthorizedError } from "./errors";

export async function createGitHubAdapterForUser(userId: string): Promise<GitHubAdapter> {
  if (!userId) {
    throw new GitHubUnauthorizedError("User ID is required to create GitHub client.");
  }

  const auth = await db.gitHubAuth.findUnique({
    where: { userId },
  });

  if (!auth || !auth.accessToken) {
    throw new GitHubUnauthorizedError("No connected GitHub account found for user.");
  }

  return new OctokitGitHubAdapter(auth.accessToken);
}
