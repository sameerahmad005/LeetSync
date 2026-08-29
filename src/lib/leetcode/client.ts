import { LeetCodeGraphQLAdapter } from "./adapter";
import { LeetCodeAdapter } from "./types";

export function createLeetCodeAdapter(): LeetCodeAdapter {
  return new LeetCodeGraphQLAdapter();
}

export const defaultLeetCodeAdapter = createLeetCodeAdapter();
