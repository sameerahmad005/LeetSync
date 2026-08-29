import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../src/lib/rateLimit";

describe("Phase 8: API Route Security & Authorization Tests", () => {
  it("Rate Limiter: enforces sliding window limits per user ID", () => {
    const userId = "test_user_rate_limit_123";

    const res1 = checkRateLimit(userId, 2);
    expect(res1.success).toBe(true);

    const res2 = checkRateLimit(userId, 2);
    expect(res2.success).toBe(false);
  });
});
