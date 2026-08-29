import { DifficultyLevel } from "./types";
import { UnsupportedLanguageError } from "./errors";

const LANGUAGE_MAP: Record<string, { normalizedLanguage: string; extension: string }> = {
  cpp: { normalizedLanguage: "C++", extension: "cpp" },
  "c++": { normalizedLanguage: "C++", extension: "cpp" },
  c: { normalizedLanguage: "C", extension: "c" },
  python: { normalizedLanguage: "Python", extension: "py" },
  python3: { normalizedLanguage: "Python", extension: "py" },
  py: { normalizedLanguage: "Python", extension: "py" },
  java: { normalizedLanguage: "Java", extension: "java" },
  javascript: { normalizedLanguage: "JavaScript", extension: "js" },
  js: { normalizedLanguage: "JavaScript", extension: "js" },
  typescript: { normalizedLanguage: "TypeScript", extension: "ts" },
  ts: { normalizedLanguage: "TypeScript", extension: "ts" },
  golang: { normalizedLanguage: "Go", extension: "go" },
  go: { normalizedLanguage: "Go", extension: "go" },
  rust: { normalizedLanguage: "Rust", extension: "rs" },
  rs: { normalizedLanguage: "Rust", extension: "rs" },
  csharp: { normalizedLanguage: "C#", extension: "cs" },
  "c#": { normalizedLanguage: "C#", extension: "cs" },
  cs: { normalizedLanguage: "C#", extension: "cs" },
  kotlin: { normalizedLanguage: "Kotlin", extension: "kt" },
  kt: { normalizedLanguage: "Kotlin", extension: "kt" },
  swift: { normalizedLanguage: "Swift", extension: "swift" },
  scala: { normalizedLanguage: "Scala", extension: "scala" },
  ruby: { normalizedLanguage: "Ruby", extension: "rb" },
  rb: { normalizedLanguage: "Ruby", extension: "rb" },
  php: { normalizedLanguage: "PHP", extension: "php" },
  sql: { normalizedLanguage: "SQL", extension: "sql" },
  mysql: { normalizedLanguage: "MySQL", extension: "sql" },
  mssql: { normalizedLanguage: "MSSQL", extension: "sql" },
  oracle: { normalizedLanguage: "Oracle", extension: "sql" },
};

export function normalizeLanguage(lang: string): { normalizedLanguage: string; extension: string } {
  if (!lang) {
    throw new UnsupportedLanguageError("unknown");
  }

  const key = lang.trim().toLowerCase();
  const matched = LANGUAGE_MAP[key];

  if (!matched) {
    throw new UnsupportedLanguageError(lang);
  }

  return matched;
}

export function normalizeDifficulty(diff: string): DifficultyLevel {
  const upper = (diff || "").trim().toUpperCase();
  if (upper === "EASY") return "EASY";
  if (upper === "MEDIUM") return "MEDIUM";
  if (upper === "HARD") return "HARD";
  return "MEDIUM";
}

export function sanitizeSlug(slug: string): string {
  if (!slug) return "unknown-problem";
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
