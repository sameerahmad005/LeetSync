import { Octokit } from "@octokit/rest";
import {
  GitHubAdapter,
  GitHubRepository,
  GitHubBranch,
  GitHubFile,
  CommitFileChange,
  CommitResult,
} from "./types";
import { handleOctokitError, sanitizePath } from "./errors";
import { updateReadmeContent } from "./readme";

export class OctokitGitHubAdapter implements GitHubAdapter {
  private octokit: Octokit;

  constructor(accessToken: string, octokitInstance?: Octokit) {
    if (!accessToken && !octokitInstance) {
      throw new Error("Access token is required to initialize GitHub Adapter.");
    }
    this.octokit = octokitInstance || new Octokit({ auth: accessToken });
  }

  async listRepositories(): Promise<GitHubRepository[]> {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
        type: "all",
      });

      return data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        permissions: {
          admin: repo.permissions?.admin ?? false,
          push: repo.permissions?.push ?? false,
          pull: repo.permissions?.pull ?? true,
        },
        htmlUrl: repo.html_url,
      }));
    } catch (error) {
      handleOctokitError(error);
    }
  }

  async createRepository(
    name: string,
    description = "LeetCode solutions synced automatically with LeetSync",
    isPrivate = false
  ): Promise<GitHubRepository> {
    try {
      const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true,
      });

      return {
        id: data.id,
        name: data.name,
        owner: data.owner.login,
        fullName: data.full_name,
        private: data.private,
        defaultBranch: data.default_branch || "main",
        permissions: {
          admin: true,
          push: true,
          pull: true,
        },
        htmlUrl: data.html_url,
      };
    } catch (error) {
      handleOctokitError(error);
    }
  }

  async listBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    try {
      const { data } = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return data.map((b) => ({
        name: b.name,
        protected: b.protected,
      }));
    } catch (error: any) {
      if (error.status === 404) {
        return [{ name: "main", protected: false }];
      }
      handleOctokitError(error);
    }
  }

  async verifyRepositoryAccess(owner: string, repo: string): Promise<boolean> {
    try {
      const { data } = await this.octokit.rest.repos.get({ owner, repo });
      return data.permissions?.push ?? false;
    } catch (error: any) {
      if (error.status === 404 || error.name === "HttpError") {
        return false;
      }
      handleOctokitError(error);
    }
  }

  async getFile(owner: string, repo: string, path: string, ref: string): Promise<GitHubFile | null> {
    const sanitizedPath = sanitizePath(path);
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: sanitizedPath,
        ref,
      });

      if (Array.isArray(data) || data.type !== "file") {
        return null;
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return {
        path: sanitizedPath,
        content,
        sha: data.sha,
      };
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      handleOctokitError(error);
    }
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<CommitResult> {
    const sanitizedPath = sanitizePath(path);
    try {
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: sanitizedPath,
        message,
        content: Buffer.from(content).toString("base64"),
        branch,
        sha,
      });

      return {
        commitSha: data.commit.sha || "",
        commitUrl: data.commit.html_url || `https://github.com/${owner}/${repo}/commit/${data.commit.sha}`,
        filesCount: 1,
      };
    } catch (error) {
      handleOctokitError(error);
    }
  }

  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    files: CommitFileChange[],
    message: string
  ): Promise<CommitResult> {
    if (files.length === 0) {
      throw new Error("No files provided for commit creation.");
    }

    if (files.length === 1) {
      const file = files[0];
      const existing = await this.getFile(owner, repo, file.path, branch);
      return this.createOrUpdateFile(
        owner,
        repo,
        file.path,
        file.content,
        message,
        branch,
        existing?.sha
      );
    }

    try {
      // 1. Get reference to current branch head
      const refResponse = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      const latestCommitSha = refResponse.data.object.sha;

      // 2. Get base tree SHA
      const commitResponse = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });
      const baseTreeSha = commitResponse.data.tree.sha;

      // 3. Create blobs for each file
      const treeItems = await Promise.all(
        files.map(async (file) => {
          const sanitized = sanitizePath(file.path);
          const blobResponse = await this.octokit.rest.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: "utf-8",
          });

          return {
            path: sanitized,
            mode: "100644" as const,
            type: "blob" as const,
            sha: blobResponse.data.sha,
          };
        })
      );

      // 4. Create new tree
      const newTreeResponse = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: treeItems,
      });

      // 5. Create commit
      const newCommitResponse = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTreeResponse.data.sha,
        parents: [latestCommitSha],
      });

      // 6. Update branch reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommitResponse.data.sha,
      });

      return {
        commitSha: newCommitResponse.data.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommitResponse.data.sha}`,
        filesCount: files.length,
      };
    } catch (error) {
      handleOctokitError(error);
    }
  }

  async updateReadmeSection(
    owner: string,
    repo: string,
    branch: string,
    statsContent: string
  ): Promise<CommitResult | null> {
    const readmePath = "README.md";
    const existingFile = await this.getFile(owner, repo, readmePath, branch);

    const existingText = existingFile ? existingFile.content : "# LeetCode Solutions\n\nAutomated with LeetSync.\n";
    const updatedText = updateReadmeContent(existingText, statsContent);

    // If unchanged, no need to commit
    if (existingFile && existingFile.content === updatedText) {
      return null;
    }

    return this.createOrUpdateFile(
      owner,
      repo,
      readmePath,
      updatedText,
      "Update LeetSync statistics in README",
      branch,
      existingFile?.sha
    );
  }
}
