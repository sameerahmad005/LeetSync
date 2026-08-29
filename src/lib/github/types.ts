export interface GitHubRepository {
  id: number;
  name: string;
  owner: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  permissions: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
  htmlUrl: string;
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
}

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface CommitFileChange {
  path: string;
  content: string;
}

export interface CommitResult {
  commitSha: string;
  commitUrl: string;
  filesCount: number;
}

export interface GitHubAdapter {
  listRepositories(): Promise<GitHubRepository[]>;
  createRepository(name: string, description?: string, isPrivate?: boolean): Promise<GitHubRepository>;
  listBranches(owner: string, repo: string): Promise<GitHubBranch[]>;
  verifyRepositoryAccess(owner: string, repo: string): Promise<boolean>;
  getFile(owner: string, repo: string, path: string, ref: string): Promise<GitHubFile | null>;
  createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<CommitResult>;
  createCommit(
    owner: string,
    repo: string,
    branch: string,
    files: CommitFileChange[],
    message: string
  ): Promise<CommitResult>;
  updateReadmeSection(
    owner: string,
    repo: string,
    branch: string,
    statsContent: string
  ): Promise<CommitResult | null>;
}
