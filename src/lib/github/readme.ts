export const README_START_MARKER = "<!-- LEETSYNC:START -->";
export const README_END_MARKER = "<!-- LEETSYNC:END -->";

export function updateReadmeContent(existingContent: string, statsMarkdown: string): string {
  const formattedStats = `${README_START_MARKER}\n${statsMarkdown.trim()}\n${README_END_MARKER}`;

  const startIndex = existingContent.indexOf(README_START_MARKER);
  const endIndex = existingContent.indexOf(README_END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    // Replace content between markers safely while preserving surrounding user text
    const before = existingContent.substring(0, startIndex);
    const after = existingContent.substring(endIndex + README_END_MARKER.length);
    return `${before.trimEnd()}\n\n${formattedStats}\n\n${after.trimStart()}`.trim() + "\n";
  }

  // If markers do not exist, append markers cleanly at the end of the existing content
  if (existingContent.trim().length === 0) {
    return `${formattedStats}\n`;
  }

  return `${existingContent.trim()}\n\n${formattedStats}\n`;
}
