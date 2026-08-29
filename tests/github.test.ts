import { describe, it, expect, vi, beforeEach } from "vitest";
import { OctokitGitHubAdapter } from "../src/lib/github/adapter";
import { GitHubPermissionError, GitHubRateLimitError, GitHubUnauthorizedError } from "../src/lib/github/errors";

describe("Phase 4: GitHub Adapter Unit Tests", () => {
  let adapter: OctokitGitHubAdapter;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        repos: {
          listForAuthenticatedUser: vi.fn(),
          createForAuthenticatedUser: vi.fn(),
          listBranches: vi.fn(),
          get: vi.fn(),
          getContent: vi.fn(),
          createOrUpdateFileContents: vi.fn(),
        },
        git: {
          getRef: vi.fn(),
          getCommit: vi.fn(),
          createBlob: vi.fn(),
          createTree: vi.fn(),
          createCommit: vi.fn(),
          updateRef: vi.fn(),
        },
      },
    };

    adapter = new OctokitGitHubAdapter("fake-token", mockOctokit);
  });

  describe("Repository & Branch Operations", () => {
    it("listRepositories: returns list of user repositories with permissions", async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValueOnce({
        data: [
          {
            id: 101,
            name: "leetcode-solutions",
            owner: { login: "testuser" },
            full_name: "testuser/leetcode-solutions",
            private: false,
            default_branch: "main",
            permissions: { admin: true, push: true, pull: true },
            html_url: "https://github.com/testuser/leetcode-solutions",
          },
        ],
      });

      const repos = await adapter.listRepositories();
      expect(repos).toHaveLength(1);
      expect(repos[0].fullName).toBe("testuser/leetcode-solutions");
      expect(repos[0].permissions.push).toBe(true);
    });

    it("createRepository: creates a new repository on GitHub with auto_init", async () => {
      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValueOnce({
        data: {
          id: 102,
          name: "my-leetcode-solutions",
          owner: { login: "testuser" },
          full_name: "testuser/my-leetcode-solutions",
          private: false,
          default_branch: "main",
          html_url: "https://github.com/testuser/my-leetcode-solutions",
        },
      });

      const repo = await adapter.createRepository("my-leetcode-solutions", "LeetCode sync", false);
      expect(repo.fullName).toBe("testuser/my-leetcode-solutions");
      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: "my-leetcode-solutions",
        description: "LeetCode sync",
        private: false,
        auto_init: true,
      });
    });

    it("listBranches: returns branches for repository", async () => {
      mockOctokit.rest.repos.listBranches.mockResolvedValueOnce({
        data: [{ name: "main", protected: false }, { name: "dev", protected: true }],
      });

      const branches = await adapter.listBranches("testuser", "leetcode-solutions");
      expect(branches).toHaveLength(2);
      expect(branches[0].name).toBe("main");
    });

    it("verifyRepositoryAccess: returns true when push permission is granted", async () => {
      mockOctokit.rest.repos.get.mockResolvedValueOnce({
        data: { permissions: { push: true } },
      });

      const canPush = await adapter.verifyRepositoryAccess("testuser", "leetcode-solutions");
      expect(canPush).toBe(true);
    });
  });

  describe("File Reading & Single File Operations", () => {
    it("getFile: retrieves file content decoding base64", async () => {
      const base64Content = Buffer.from("# LeetCode\n").toString("base64");
      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: { type: "file", content: base64Content, sha: "sha123" },
      });

      const file = await adapter.getFile("testuser", "leetcode-solutions", "README.md", "main");
      expect(file?.content).toBe("# LeetCode\n");
      expect(file?.sha).toBe("sha123");
    });

    it("getFile: returns null when file does not exist (404)", async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValueOnce({ status: 404 });

      const file = await adapter.getFile("testuser", "leetcode-solutions", "nonexistent.py", "main");
      expect(file).toBeNull();
    });

    it("createOrUpdateFile: single file creation calls repo API directly", async () => {
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce({
        data: { commit: { sha: "commit_abc", html_url: "https://github.com/commit/abc" } },
      });

      const result = await adapter.createOrUpdateFile(
        "testuser",
        "leetcode-solutions",
        "solutions/easy/two-sum/solution.py",
        "print('hello')",
        "Add two-sum solution",
        "main"
      );

      expect(result.commitSha).toBe("commit_abc");
      expect(result.filesCount).toBe(1);
    });
  });

  describe("Atomic Multi-File Batch Commit (Git Data API)", () => {
    it("createCommit: uses Git Data API for multi-file batch commit", async () => {
      // 1. mock getRef
      mockOctokit.rest.git.getRef.mockResolvedValueOnce({
        data: { object: { sha: "head_commit_sha" } },
      });
      // 2. mock getCommit
      mockOctokit.rest.git.getCommit.mockResolvedValueOnce({
        data: { tree: { sha: "base_tree_sha" } },
      });
      // 3. mock createBlob for 2 files
      mockOctokit.rest.git.createBlob
        .mockResolvedValueOnce({ data: { sha: "blob_sha_1" } })
        .mockResolvedValueOnce({ data: { sha: "blob_sha_2" } });
      // 4. mock createTree
      mockOctokit.rest.git.createTree.mockResolvedValueOnce({
        data: { sha: "new_tree_sha" },
      });
      // 5. mock createCommit
      mockOctokit.rest.git.createCommit.mockResolvedValueOnce({
        data: { sha: "batch_commit_sha" },
      });
      // 6. mock updateRef
      mockOctokit.rest.git.updateRef.mockResolvedValueOnce({ data: {} });

      const files = [
        { path: "solutions/easy/two-sum/solution.py", content: "# code" },
        { path: "solutions/easy/two-sum/README.md", content: "# readme" },
      ];

      const result = await adapter.createCommit(
        "testuser",
        "leetcode-solutions",
        "main",
        files,
        "Batch sync 1 solution"
      );

      expect(result.commitSha).toBe("batch_commit_sha");
      expect(result.filesCount).toBe(2);
      expect(mockOctokit.rest.git.createTree).toHaveBeenCalledWith(
        expect.objectContaining({
          base_tree: "base_tree_sha",
          tree: expect.arrayContaining([
            expect.objectContaining({ sha: "blob_sha_1" }),
            expect.objectContaining({ sha: "blob_sha_2" }),
          ]),
        })
      );
    });
  });

  describe("Error Normalization & Rate Limiting", () => {
    it("Error handling: converts 401 response into GitHubUnauthorizedError", async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValueOnce({ status: 401 });
      await expect(adapter.listRepositories()).rejects.toThrow(GitHubUnauthorizedError);
    });

    it("Error handling: converts rate limit response into GitHubRateLimitError", async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValueOnce({
        status: 403,
        response: { headers: { "x-ratelimit-remaining": "0" } },
      });
      await expect(adapter.listRepositories()).rejects.toThrow(GitHubRateLimitError);
    });

    it("Error handling: verifyRepositoryAccess returns false on 404 response", async () => {
      mockOctokit.rest.repos.get.mockRejectedValueOnce({ status: 404, message: "Not Found" });
      const result = await adapter.verifyRepositoryAccess("testuser", "nonexistent");
      expect(result).toBe(false);
    });
  });
});
