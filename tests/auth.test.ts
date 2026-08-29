import { describe, it, expect, beforeEach } from "vitest";
import { generateOAuthState } from "../src/lib/auth/oauth";
import { createSessionJwt, verifySessionJwt } from "../src/lib/auth/session";

describe("Phase 3: Security & Session Authentication Tests", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-at-least-32-characters-long-key-for-vitest";
    process.env.GITHUB_CLIENT_ID = "test_client_id";
    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";
  });

  it("OAuth State: generates unique, high-entropy cryptographic strings", () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();

    expect(state1).toHaveLength(64); // 32 bytes in hex
    expect(state2).toHaveLength(64);
    expect(state1).not.toBe(state2);
  });

  it("Session JWT: creates and verifies signed HTTP-only session JWT containing only userId", async () => {
    const userId = "user_cuid_123456789";
    const token = await createSessionJwt(userId);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const payload = await verifySessionJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(userId);
  });

  it("Token Isolation: session JWT payload does NOT contain GitHub access tokens or credentials", async () => {
    const userId = "user_cuid_987654321";
    const token = await createSessionJwt(userId);

    // Decode base64 header and payload without verifying to inspect contents
    const parts = token.split(".");
    const decodedPayload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));

    expect(decodedPayload).toHaveProperty("userId", userId);
    expect(decodedPayload).not.toHaveProperty("accessToken");
    expect(decodedPayload).not.toHaveProperty("githubToken");
    expect(decodedPayload).not.toHaveProperty("secret");
  });

  it("Session Verification: rejects tampered or invalid JWT tokens", async () => {
    const userId = "user_cuid_12345";
    const token = await createSessionJwt(userId);

    // Tamper token payload
    const parts = token.split(".");
    const tamperedToken = `${parts[0]}.tamperedpayload.${parts[2]}`;

    const payload = await verifySessionJwt(tamperedToken);
    expect(payload).toBeNull();
  });

  it("Session Verification: rejects token signed with a different secret", async () => {
    const userId = "user_cuid_12345";
    const token = await createSessionJwt(userId);

    // Change secret
    process.env.AUTH_SECRET = "different-secret-key-that-is-also-at-least-32-chars-long";

    const payload = await verifySessionJwt(token);
    expect(payload).toBeNull();
  });
});
