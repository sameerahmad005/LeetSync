import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeetCodeGraphQLAdapter } from "../src/lib/leetcode/adapter";
import { normalizeLanguage, normalizeDifficulty, sanitizeSlug } from "../src/lib/leetcode/normalizer";
import { UnsupportedLanguageError, LeetCodeRateLimitError, LeetCodeUserNotFoundError } from "../src/lib/leetcode/errors";

describe("Phase 5: LeetCode Adapter & Normalizer Unit Tests", () => {
  describe("Language & Difficulty Normalizer", () => {
    it("Language Normalizer: maps standard language identifiers to normalized extensions", () => {
      expect(normalizeLanguage("cpp")).toEqual({ normalizedLanguage: "C++", extension: "cpp" });
      expect(normalizeLanguage("python3")).toEqual({ normalizedLanguage: "Python", extension: "py" });
      expect(normalizeLanguage("java")).toEqual({ normalizedLanguage: "Java", extension: "java" });
      expect(normalizeLanguage("javascript")).toEqual({ normalizedLanguage: "JavaScript", extension: "js" });
      expect(normalizeLanguage("typescript")).toEqual({ normalizedLanguage: "TypeScript", extension: "ts" });
      expect(normalizeLanguage("golang")).toEqual({ normalizedLanguage: "Go", extension: "go" });
      expect(normalizeLanguage("rust")).toEqual({ normalizedLanguage: "Rust", extension: "rs" });
      expect(normalizeLanguage("csharp")).toEqual({ normalizedLanguage: "C#", extension: "cs" });
    });

    it("Language Normalizer: throws UnsupportedLanguageError on unknown language", () => {
      expect(() => normalizeLanguage("brainfuck")).toThrow(UnsupportedLanguageError);
      expect(() => normalizeLanguage("")).toThrow(UnsupportedLanguageError);
    });

    it("Difficulty Normalizer: normalizes string cases to EASY, MEDIUM, or HARD", () => {
      expect(normalizeDifficulty("easy")).toBe("EASY");
      expect(normalizeDifficulty("Medium")).toBe("MEDIUM");
      expect(normalizeDifficulty("HARD")).toBe("HARD");
      expect(normalizeDifficulty("invalid")).toBe("MEDIUM");
    });

    it("Slug Sanitizer: strips special characters and prevents path traversal", () => {
      expect(sanitizeSlug("two-sum")).toBe("two-sum");
      expect(sanitizeSlug("../../two-sum")).toBe("two-sum");
      expect(sanitizeSlug("3sum-closest!@#")).toBe("3sum-closest");
    });
  });

  describe("LeetCode GraphQL Adapter Network Interactions", () => {
    let adapter: LeetCodeGraphQLAdapter;

    beforeEach(() => {
      adapter = new LeetCodeGraphQLAdapter("https://mock-leetcode.com/graphql");
      vi.restoreAllMocks();
    });

    it("getRecentSubmissions: returns normalized accepted submissions", async () => {
      const mockFetch = vi.fn().mockImplementation((url, options) => {
        const body = JSON.parse(options.body);
        if (body.query.includes("recentAcSubmissions")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  recentAcSubmissionList: [
                    {
                      id: "12345",
                      title: "Two Sum",
                      titleSlug: "two-sum",
                      timestamp: "1724832000",
                      lang: "cpp",
                    },
                  ],
                },
              }),
          });
        }
        if (body.query.includes("questionData")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  question: {
                    title: "Two Sum",
                    titleSlug: "two-sum",
                    difficulty: "Easy",
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error("Unknown query"));
      });

      vi.stubGlobal("fetch", mockFetch);

      const subs = await adapter.getRecentSubmissions("testuser");
      expect(subs).toHaveLength(1);
      expect(subs[0].id).toBe("12345");
      expect(subs[0].problemSlug).toBe("two-sum");
      expect(subs[0].difficulty).toBe("EASY");
      expect(subs[0].extension).toBe("cpp");
      expect(subs[0].status).toBe("ACCEPTED");
    });

    it("GraphQL Errors: handles rate limit 429 status code", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
        })
      );

      await expect(adapter.getRecentSubmissions("testuser")).rejects.toThrow(LeetCodeRateLimitError);
    });

    it("GraphQL Errors: handles invalid/missing user response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { recentAcSubmissionList: null } }),
        })
      );

      await expect(adapter.getRecentSubmissions("nonexistent_user")).rejects.toThrow(LeetCodeUserNotFoundError);
    });
  });
});
