import crypto from "crypto";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails";

export interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getGitHubAuthUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("GITHUB_CLIENT_ID is not configured in environment variables.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/github/callback`,
    scope: "read:user user:email repo",
    state,
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; scope: string; tokenType: string }> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub Client ID or Secret is missing in environment variables.");
  }

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange GitHub code: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    scope: data.scope || "",
    tokenType: data.token_type || "bearer",
  };
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUserProfile> {
  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "LeetSync-App",
      Accept: "application/json",
    },
  });

  if (!userResponse.ok) {
    throw new Error(`Failed to fetch GitHub user details: ${userResponse.statusText}`);
  }

  const profile = await userResponse.json();

  let email = profile.email;
  if (!email) {
    try {
      const emailResponse = await fetch(GITHUB_USER_EMAILS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "LeetSync-App",
          Accept: "application/json",
        },
      });

      if (emailResponse.ok) {
        const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await emailResponse.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified) || emails[0];
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }
    } catch {
      // Ignore email fetch failures if primary email missing
    }
  }

  return {
    id: profile.id,
    login: profile.login,
    name: profile.name,
    email: email || null,
    avatar_url: profile.avatar_url,
  };
}
