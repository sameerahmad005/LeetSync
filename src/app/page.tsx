import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  // If user is already authenticated, auto-redirect directly to dashboard!
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold tracking-wide text-sky-400 uppercase bg-sky-950/60 border border-sky-800/50 rounded-full">
          LeetCode to GitHub Sync Engine
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          Automatically push your <span className="text-sky-400">LeetCode</span> solutions to <span className="text-purple-400">GitHub</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Solve problems on LeetCode once. LeetSync detects accepted submissions, formats folder structures, updates problem READMEs, and commits clean solutions automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/api/auth/github"
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
          >
            Sign In with GitHub
          </Link>
        </div>
      </div>
    </main>
  );
}
