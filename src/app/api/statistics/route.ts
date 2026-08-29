import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [difficultyStats, languageStats, totalSubmissions, recentSubmissions] = await Promise.all([
    db.submission.groupBy({
      by: ["difficulty"],
      where: { userId: user.id },
      _count: { _all: true },
    }),
    db.submission.groupBy({
      by: ["normalizedLanguage"],
      where: { userId: user.id },
      _count: { _all: true },
    }),
    db.submission.count({
      where: { userId: user.id },
    }),
    db.submission.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: "desc" },
      take: 10,
    }),
  ]);

  const easy = difficultyStats.find((s) => s.difficulty === "EASY")?._count._all || 0;
  const medium = difficultyStats.find((s) => s.difficulty === "MEDIUM")?._count._all || 0;
  const hard = difficultyStats.find((s) => s.difficulty === "HARD")?._count._all || 0;

  const languages: Record<string, number> = {};
  for (const l of languageStats) {
    languages[l.normalizedLanguage] = l._count._all;
  }

  return NextResponse.json({
    statistics: {
      total: totalSubmissions,
      easy,
      medium,
      hard,
      languages,
    },
    recentSubmissions,
  });
}
