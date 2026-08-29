import { NextResponse } from "next/server";
import { generateOAuthState, getGitHubAuthUrl } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = generateOAuthState();
    const authUrl = getGitHubAuthUrl(state);

    const response = NextResponse.redirect(authUrl);

    // Set short-lived state cookie for OAuth validation (10 mins)
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to initiate GitHub authentication." },
      { status: 500 }
    );
  }
}
