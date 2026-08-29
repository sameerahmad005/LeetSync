import { describe, it, expect } from "vitest";
import { updateReadmeContent, README_START_MARKER, README_END_MARKER } from "../src/lib/github/readme";
import { generateStatsMarkdown } from "../src/lib/sync/templates";

describe("Phase 12: Repository README Statistics Unit Tests", () => {
  it("Marker preservation: updates ONLY content between markers when markers exist", () => {
    const originalReadme = `# Custom User Header\n\nIntro text.\n\n${README_START_MARKER}\n| Easy | 5 |\n${README_END_MARKER}\n\n## Custom User Footer\nFooter text.`;

    const newStatsMarkdown = generateStatsMarkdown({
      easyCount: 10,
      mediumCount: 5,
      hardCount: 1,
      languageCounts: { "C++": 12, Python: 4 },
    });

    const updated = updateReadmeContent(originalReadme, newStatsMarkdown);

    expect(updated).toContain("# Custom User Header");
    expect(updated).toContain("Intro text.");
    expect(updated).toContain("## Custom User Footer");
    expect(updated).toContain("Footer text.");
    expect(updated).toContain("🟢 **Easy** | 10");
    expect(updated).toContain("🟡 **Medium** | 5");
    expect(updated).toContain("🔴 **Hard** | 1");
    expect(updated).toContain("C++ | 12");
    expect(updated).not.toContain("| Easy | 5 |");
  });

  it("Marker appending: appends markers at end when markers do not exist in existing README", () => {
    const originalReadme = "# Portfolio\n\nWelcome to my repository.";
    const newStatsMarkdown = generateStatsMarkdown({
      easyCount: 2,
      mediumCount: 1,
      hardCount: 0,
      languageCounts: { TypeScript: 3 },
    });

    const updated = updateReadmeContent(originalReadme, newStatsMarkdown);

    expect(updated).toContain("# Portfolio\n\nWelcome to my repository.");
    expect(updated).toContain(README_START_MARKER);
    expect(updated).toContain(README_END_MARKER);
    expect(updated).toContain("TypeScript | 3");
  });
});
