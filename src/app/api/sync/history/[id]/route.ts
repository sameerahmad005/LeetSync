import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncRun = await db.syncRun.findFirst({
    where: {
      id: params.id,
      userId: user.id, // Authorization check: user can only access their own sync runs!
    },
    include: {
      syncItems: {
        include: {
          submission: true,
        },
      },
    },
  });

  if (!syncRun) {
    return NextResponse.json({ error: "Sync run record not found" }, { status: 404 });
  }

  return NextResponse.json({ syncRun });
}
