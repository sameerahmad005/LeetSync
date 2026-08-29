export class GitHubApiError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number = 500, code: string = "GITHUB_API_ERROR") {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.code = code;
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(resetTimestamp?: number) {
    super("GitHub API rate limit exceeded. Please try again later.", 429, "RATE_LIMIT_EXCEEDED");
  }
}

export class GitHubUnauthorizedError extends GitHubApiError {
  constructor(message = "GitHub authentication token expired or invalid.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  constructor(resource = "Repository or file") {
    super(`${resource} not found on GitHub.`, 404, "NOT_FOUND");
  }
}

export class GitHubPermissionError extends GitHubApiError {
  constructor(message = "Insufficient permissions to write to target repository.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class InvalidPathError extends GitHubApiError {
  constructor(path: string) {
    super(`Invalid repository file path: "${path}". Path traversal is forbidden.`, 400, "INVALID_PATH");
  }
}

export function handleOctokitError(error: any): never {
  if (error instanceof GitHubApiError) {
    throw error;
  }

  const status = error.status || error.statusCode || 500;
  const message = error.message || "An unknown GitHub API error occurred";

  if (status === 401) {
    throw new GitHubUnauthorizedError(message);
  }
  if (status === 403) {
    if (error.response?.headers?.["x-ratelimit-remaining"] === "0") {
      throw new GitHubRateLimitError();
    }
    throw new GitHubPermissionError(message);
  }
  if (status === 404) {
    throw new GitHubNotFoundError(message);
  }
  if (status === 429) {
    throw new GitHubRateLimitError();
  }

  throw new GitHubApiError(message, status);
}

export function sanitizePath(filePath: string): string {
  if (!filePath) {
    throw new InvalidPathError(filePath);
  }

  // Prevent path traversal attacks (e.g., ../ or ..\)
  if (filePath.includes("..") || filePath.includes("\0")) {
    throw new InvalidPathError(filePath);
  }

  // Normalize slashes and trim whitespace/leading slashes
  const normalized = filePath.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "").trim();

  if (!normalized) {
    throw new InvalidPathError(filePath);
  }

  return normalized;
}
