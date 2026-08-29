export class SyncEngineError extends Error {
  public code: string;

  constructor(message: string, code = "SYNC_ENGINE_ERROR") {
    super(message);
    this.name = "SyncEngineError";
    this.code = code;
  }
}

export class UserNotConfiguredError extends SyncEngineError {
  constructor(message = "User has not configured a LeetCode username or GitHub repository.") {
    super(message, "USER_NOT_CONFIGURED");
  }
}

export class DuplicateSubmissionError extends SyncEngineError {
  constructor(submissionId: string) {
    super(`Submission ${submissionId} has already been synchronized.`, "DUPLICATE_SUBMISSION");
  }
}
