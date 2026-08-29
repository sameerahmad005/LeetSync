import { sanitizePath } from "@/lib/github/errors";
import { sanitizeSlug } from "@/lib/leetcode/normalizer";

export interface PathTemplateParams {
  rootDir: string;
  difficulty: string;
  problemSlug: string;
  extension: string;
  folderStructure?: string;
}

export function generateFilePath(params: PathTemplateParams): string {
  const rootDir = (params.rootDir || "solutions").trim();
  const difficulty = (params.difficulty || "medium").toLowerCase();
  const problemSlug = sanitizeSlug(params.problemSlug);
  const extension = params.extension.replace(/^\.+/, "");

  let template = params.folderStructure || "{rootDir}/{difficulty}/{problem-slug}";

  // Replace placeholders
  let folder = template
    .replace(/{rootDir}/g, rootDir)
    .replace(/{difficulty}/g, difficulty)
    .replace(/{problem-slug}/g, problemSlug);

  const fullPath = `${folder}/solution.${extension}`;

  return sanitizePath(fullPath);
}

export function generateProblemReadmePath(solutionPath: string): string {
  const sanitized = sanitizePath(solutionPath);
  const lastSlashIndex = sanitized.lastIndexOf("/");

  if (lastSlashIndex === -1) {
    return "README.md";
  }

  const folder = sanitized.substring(0, lastSlashIndex);
  return `${folder}/README.md`;
}
