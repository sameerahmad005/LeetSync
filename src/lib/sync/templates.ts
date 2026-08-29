export interface ProblemReadmeParams {
  title: string;
  problemSlug: string;
  difficulty: string;
  language: string;
  submittedAt: Date;
  timeComplexity?: string;
  spaceComplexity?: string;
  leetcodeUsername?: string;
}

export function generateProblemReadme(params: ProblemReadmeParams): string {
  const formattedDate = params.submittedAt.toISOString().split("T")[0];
  const problemUrl = `https://leetcode.com/problems/${params.problemSlug}/`;
  const userProfileUrl = params.leetcodeUsername ? `https://leetcode.com/u/${params.leetcodeUsername}/` : null;

  let markdown = `# ${params.title}\n\n`;
  markdown += `**Difficulty:** ${params.difficulty.charAt(0).toUpperCase() + params.difficulty.slice(1).toLowerCase()}\n\n`;
  markdown += `**Language:** ${params.language}\n\n`;
  markdown += `**Solved Date:** ${formattedDate}\n\n`;
  markdown += `**LeetCode Link:** [${params.title}](${problemUrl})\n\n`;

  if (userProfileUrl) {
    markdown += `**LeetCode Profile:** [@${params.leetcodeUsername}](${userProfileUrl})\n\n`;
  }

  markdown += `## Problem Description\n\nSolution to [${params.title}](${problemUrl}) on LeetCode.\n\n`;

  if (params.timeComplexity || params.spaceComplexity) {
    markdown += `## Complexity Analysis\n\n`;
    if (params.timeComplexity) {
      markdown += `- **Time Complexity:** ${params.timeComplexity}\n`;
    }
    if (params.spaceComplexity) {
      markdown += `- **Space Complexity:** ${params.spaceComplexity}\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n*Automated with [LeetSync](https://github.com/sameerahmad005/LeetSync)*`;

  return markdown;
}

export interface StatsMarkdownParams {
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  languageCounts: Record<string, number>;
  leetcodeUsername?: string;
}

export function generateStatsMarkdown(params: StatsMarkdownParams): string {
  const total = params.easyCount + params.mediumCount + params.hardCount;
  const profileHeader = params.leetcodeUsername
    ? ` ([@${params.leetcodeUsername}](https://leetcode.com/u/${params.leetcodeUsername}/))`
    : "";

  let markdown = `## 📊 LeetCode Progress${profileHeader}\n\n`;
  markdown += `| Difficulty | Solved |\n`;
  markdown += `| :--- | :--- |\n`;
  markdown += `| 🟢 **Easy** | ${params.easyCount} |\n`;
  markdown += `| 🟡 **Medium** | ${params.mediumCount} |\n`;
  markdown += `| 🔴 **Hard** | ${params.hardCount} |\n`;
  markdown += `| 🏆 **Total** | **${total}** |\n\n`;

  const languages = Object.entries(params.languageCounts);
  if (languages.length > 0) {
    markdown += `### 💻 Languages\n\n`;
    markdown += `| Language | Solved |\n`;
    markdown += `| :--- | :--- |\n`;
    for (const [lang, count] of languages) {
      markdown += `| ${lang} | ${count} |\n`;
    }
    markdown += `\n`;
  }

  markdown += `*Automated with [LeetSync](https://github.com/sameerahmad005/LeetSync)*\n`;

  return markdown;
}
