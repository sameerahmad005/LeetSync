export class LeetCodeError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status = 500, code = "LEETCODE_ERROR") {
    super(message);
    this.name = "LeetCodeError";
    this.status = status;
    this.code = code;
  }
}

export class LeetCodeUserNotFoundError extends LeetCodeError {
  constructor(username: string) {
    super(`LeetCode user "${username}" was not found or has a private profile.`, 404, "USER_NOT_FOUND");
  }
}

export class LeetCodeSubmissionNotFoundError extends LeetCodeError {
  constructor(submissionId: string) {
    super(`LeetCode submission "${submissionId}" was not found.`, 404, "SUBMISSION_NOT_FOUND");
  }
}

export class LeetCodeRateLimitError extends LeetCodeError {
  constructor() {
    super("LeetCode API rate limit exceeded. Please try again later.", 429, "RATE_LIMIT_EXCEEDED");
  }
}

export class UnsupportedLanguageError extends LeetCodeError {
  constructor(language: string) {
    super(`Unsupported or unknown programming language: "${language}".`, 400, "UNSUPPORTED_LANGUAGE");
  }
}

export class LeetCodeTimeoutError extends LeetCodeError {
  constructor() {
    super("LeetCode API request timed out.", 504, "TIMEOUT");
  }
}
