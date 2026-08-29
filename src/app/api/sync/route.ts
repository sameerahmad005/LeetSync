import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { syncEngine } from "@/lib/sync/engine";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

async function resolveUserFromRequest(request: NextRequest) {
  let user = await getCurrentUser();

  if (!user) {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId") || searchParams.get("token") || searchParams.get("id");
    if (userIdParam) {
      user = await db.user.findUnique({
        where: { id: userIdParam },
        select: {
          id: true,
          githubId: true,
          username: true,
          email: true,
          name: true,
          avatarUrl: true,
          leetcodeUsername: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }
  }

  return user;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId") || searchParams.get("token") || searchParams.get("id");

  // If userId parameter is provided in GET request (e.g. from cron-job.org or webhooks), execute sync!
  if (userIdParam) {
    const user = await db.user.findUnique({
      where: { id: userIdParam },
      select: {
        id: true,
        githubId: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        leetcodeUsername: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid user ID or token." }, { status: 401 });
    }

    // Rate Limiting (10 requests per minute per user for cron/webhooks)
    const rateLimit = checkRateLimit(user.id, 10);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before triggering another sync." },
        { status: 429 }
      );
    }

    try {
      const result = await syncEngine.syncUser(user.id, {
        isDryRun: false,
        triggerType: "SCHEDULED",
      });
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Sync execution failed" }, { status: 500 });
    }
  }

  // Otherwise return latest sync run status for authenticated user
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please sign in or pass ?userId=..." }, { status: 401 });
  }

  const latestSyncRun = await db.syncRun.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      syncItems: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ syncRun: latestSyncRun });
}

export async function POST(request: NextRequest) {
  const user = await resolveUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please sign in or provide a valid user token." }, { status: 401 });
  }

  // Rate Limiting (10 requests per minute per user for instant triggers)
  const rateLimit = checkRateLimit(user.id, 10);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before triggering another sync." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const isDryRun = body.isDryRun ?? false;

    // Execute synchronization directly in serverless environment
    const result = await syncEngine.syncUser(user.id, {
      isDryRun,
      triggerType: "MANUAL",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute sync" }, { status: 500 });
  }
}
