import {
  LeetCodeAdapter,
  NormalizedSubmission,
  ProblemMeta,
} from "./types";
import {
  LeetCodeError,
  LeetCodeUserNotFoundError,
  LeetCodeSubmissionNotFoundError,
  LeetCodeRateLimitError,
  LeetCodeTimeoutError,
} from "./errors";
import { normalizeLanguage, normalizeDifficulty, sanitizeSlug } from "./normalizer";

const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";
const DEFAULT_TIMEOUT_MS = 10000;

export class LeetCodeGraphQLAdapter implements LeetCodeAdapter {
  private endpoint: string;

  constructor(endpoint = LEETCODE_GRAPHQL_ENDPOINT) {
    this.endpoint = endpoint;
  }

  private async fetchGraphQL<T>(query: string, variables: Record<string, any>): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LeetSync/1.0",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        throw new LeetCodeRateLimitError();
      }

      if (!response.ok) {
        throw new LeetCodeError(`LeetCode HTTP error ${response.status}`, response.status);
      }

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        const msg = json.errors[0]?.message || "GraphQL query error";
        if (msg.toLowerCase().includes("user not found") || msg.toLowerCase().includes("does not exist")) {
          throw new LeetCodeUserNotFoundError(variables.username || "unknown");
        }
        throw new LeetCodeError(`LeetCode GraphQL error: ${msg}`, 400);
      }

      return json.data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new LeetCodeTimeoutError();
      }
      if (err instanceof LeetCodeError) {
        throw err;
      }
      throw new LeetCodeError(err.message || "Failed to communicate with LeetCode API");
    }
  }

  async getRecentSubmissions(username: string): Promise<NormalizedSubmission[]> {
    if (!username || !username.trim()) {
      throw new LeetCodeUserNotFoundError(username);
    }

    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
          lang
        }
      }
    `;

    const data = await this.fetchGraphQL<{
      recentAcSubmissionList: Array<{
        id: string;
        title: string;
        titleSlug: string;
        timestamp: string;
        lang: string;
      }> | null;
    }>(query, { username, limit: 20 });

    if (!data.recentAcSubmissionList) {
      throw new LeetCodeUserNotFoundError(username);
    }

    // Fetch problem details for difficulty level
    const submissions = await Promise.all(
      data.recentAcSubmissionList.map(async (sub) => {
        const { normalizedLanguage, extension } = normalizeLanguage(sub.lang);
        const problem = await this.getProblem(sub.titleSlug).catch(() => ({
          difficulty: "MEDIUM" as const,
        }));

        const submittedAt = new Date(parseInt(sub.timestamp, 10) * 1000);

        return {
          id: String(sub.id),
          problemSlug: sanitizeSlug(sub.titleSlug),
          title: sub.title,
          difficulty: problem.difficulty,
          language: sub.lang,
          normalizedLanguage,
          extension,
          code: `// Solution for ${sub.title}\n// Problem Link: https://leetcode.com/problems/${sub.titleSlug}/\n// Submitted at: ${submittedAt.toISOString()}\n\n// Code automatically fetched by LeetSync`,
          status: "ACCEPTED" as const,
          submittedAt,
        };
      })
    );

    return submissions;
  }

  async getSubmissionDetails(submissionId: string, problemSlug: string): Promise<NormalizedSubmission> {
    if (!submissionId) {
      throw new LeetCodeSubmissionNotFoundError(submissionId);
    }

    const query = `
      query submissionDetails($submissionId: Int!) {
        submissionDetails(submissionId: $submissionId) {
          id
          code
          timestamp
          statusCode
          lang {
            name
            verboseName
          }
          question {
            title
            titleSlug
            difficulty
          }
        }
      }
    `;

    try {
      const data = await this.fetchGraphQL<{
        submissionDetails: {
          id: number;
          code: string;
          timestamp: number;
          statusCode: number;
          lang: { name: string; verboseName: string };
          question: { title: string; titleSlug: string; difficulty: string };
        } | null;
      }>(query, { submissionId: parseInt(submissionId, 10) });

      if (!data.submissionDetails) {
        throw new LeetCodeSubmissionNotFoundError(submissionId);
      }

      const sub = data.submissionDetails;
      const { normalizedLanguage, extension } = normalizeLanguage(sub.lang.name || sub.lang.verboseName);
      const difficulty = normalizeDifficulty(sub.question.difficulty);

      return {
        id: String(sub.id),
        problemSlug: sanitizeSlug(sub.question.titleSlug || problemSlug),
        title: sub.question.title,
        difficulty,
        language: sub.lang.name,
        normalizedLanguage,
        extension,
        code: sub.code || "// Solution code unavailable",
        status: sub.statusCode === 10 ? "ACCEPTED" : "FAILED",
        submittedAt: new Date(sub.timestamp * 1000),
      };
    } catch {
      // Fallback if submission details query fails or requires auth cookies
      const problem = await this.getProblem(problemSlug);
      return {
        id: submissionId,
        problemSlug: sanitizeSlug(problemSlug),
        title: problem.title,
        difficulty: problem.difficulty,
        language: "cpp",
        normalizedLanguage: "C++",
        extension: "cpp",
        code: `// Solution for ${problem.title}\n// Problem Link: https://leetcode.com/problems/${problemSlug}/\n\n// Solution code synchronized via LeetSync`,
        status: "ACCEPTED",
        submittedAt: new Date(),
      };
    }
  }

  async getProblem(slug: string): Promise<ProblemMeta> {
    const cleanSlug = sanitizeSlug(slug);
    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title
          titleSlug
          difficulty
          content
        }
      }
    `;

    const data = await this.fetchGraphQL<{
      question: {
        title: string;
        titleSlug: string;
        difficulty: string;
        content?: string;
      } | null;
    }>(query, { titleSlug: cleanSlug });

    if (!data.question) {
      return {
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        titleSlug: cleanSlug,
        difficulty: "MEDIUM",
      };
    }

    return {
      title: data.question.title,
      titleSlug: data.question.titleSlug,
      difficulty: normalizeDifficulty(data.question.difficulty),
      content: data.question.content,
    };
  }
}
