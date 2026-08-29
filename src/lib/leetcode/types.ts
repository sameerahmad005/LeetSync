export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export interface NormalizedSubmission {
  id: string;
  problemSlug: string;
  title: string;
  difficulty: DifficultyLevel;
  language: string;
  normalizedLanguage: string;
  extension: string;
  code: string;
  status: "ACCEPTED" | "FAILED";
  submittedAt: Date;
}

export interface ProblemMeta {
  title: string;
  titleSlug: string;
  difficulty: DifficultyLevel;
  content?: string;
  topicTags?: string[];
}

export interface LeetCodeAdapter {
  getRecentSubmissions(username: string): Promise<NormalizedSubmission[]>;
  getSubmissionDetails(submissionId: string, problemSlug: string): Promise<NormalizedSubmission>;
  getProblem(slug: string): Promise<ProblemMeta>;
}
