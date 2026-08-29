import { NextRequest, NextResponse } from "next/server";
import { syncEngine } from "@/lib/sync/engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || searchParams.get("id");

  try {
    if (userId) {
      const result = await syncEngine.syncUser(userId, { triggerType: "SCHEDULED" });
      return NextResponse.json({ status: "success", result });
    }

    const summary = await syncEngine.syncAllUsers({ triggerType: "SCHEDULED" });
    return NextResponse.json({ status: "success", summary });
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message || "Cron sync failed" }, { status: 500 });
  }
}
