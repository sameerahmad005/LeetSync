import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, fetchGitHubUser } from "@/lib/auth/oauth";
import { createSessionJwt } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "leetsync_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const storedState = request.cookies.get("oauth_state")?.value;

  // Handle user cancellation or OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Mandatory OAuth state parameter validation
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json(
      { error: "Invalid OAuth state parameter. Possible CSRF attack detected." },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code from GitHub callback." },
      { status: 400 }
    );
  }

  try {
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);

    // Fetch GitHub User profile
    const githubUser = await fetchGitHubUser(tokenData.accessToken);

    // Upsert User record
    const user = await db.user.upsert({
      where: { githubId: String(githubUser.id) },
      update: {
        username: githubUser.login,
        email: githubUser.email,
        name: githubUser.name,
        avatarUrl: githubUser.avatar_url,
      },
      create: {
        githubId: String(githubUser.id),
        username: githubUser.login,
        email: githubUser.email,
        name: githubUser.name,
        avatarUrl: githubUser.avatar_url,
      },
    });

    // Save tokens server-side in GitHubAuth (never expose in session cookie!)
    await db.gitHubAuth.upsert({
      where: { userId: user.id },
      update: {
        accessToken: tokenData.accessToken,
        tokenType: tokenData.tokenType,
        scope: tokenData.scope,
      },
      create: {
        userId: user.id,
        accessToken: tokenData.accessToken,
        tokenType: tokenData.tokenType,
        scope: tokenData.scope,
      },
    });

    // Ensure default repository config exists
    await db.repositoryConfig.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        repoOwner: githubUser.login,
        repoName: "leetcode-solutions",
        branch: "main",
        rootDir: "solutions",
      },
    });

    // Generate JWT token
    const sessionJwt = await createSessionJwt(user.id);

    // Create redirect response to dashboard
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    // Explicitly set session cookie directly on redirect response
    response.cookies.set(SESSION_COOKIE_NAME, sessionJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    });

    // Clear state cookie
    response.cookies.delete("oauth_state");

    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(err.message || "Authentication failed")}`, request.url)
    );
  }
}
