"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { History, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, LogIn, Github } from "lucide-react";

interface SyncItemLog {
  id: string;
  problemSlug: string;
  title: string;
  difficulty: string;
  language: string;
  status: string;
  githubPath?: string;
  githubCommitSha?: string;
  errorDetails?: string;
}

interface SyncRunRecord {
  id: string;
  triggerType: string;
  status: string;
  isDryRun: boolean;
  startedAt: string;
  completedAt?: string;
  detectedCount: number;
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage?: string;
  syncItems: SyncItemLog[];
}

export default function HistoryPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [history, setHistory] = useState<SyncRunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sync/history")
      .then((res) => {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return null;
        }
        setIsAuthenticated(true);
        return res.json();
      })
      .then((data) => {
        if (data) {
          setHistory(data.history || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
            Loading sync history...
          </div>
        </main>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-6">
            <div className="p-4 bg-sky-950/60 border border-sky-800/80 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-sky-400">
              <LogIn className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Authentication Required</h2>
              <p className="text-sm text-slate-400">
                Please sign in with your GitHub account to view synchronization execution history.
              </p>
            </div>
            <a
              href="/api/auth/github"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition-all"
            >
              <Github className="w-5 h-5" />
              Sign In with GitHub
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-sky-400" />
            Synchronization History
          </h1>
        </div>

        {history.length === 0 ? (
          <div className="bg-slate-900/40 p-12 rounded-xl border border-slate-800 text-center text-slate-400">
            No synchronization history recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((run) => (
              <div key={run.id} className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    {run.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : run.status === "FAILED" ? (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-400 animate-spin" />
                    )}
                    <div>
                      <div className="font-semibold text-white text-sm flex items-center gap-2">
                        <span>Sync Run ({run.triggerType})</span>
                        {run.isDryRun && (
                          <span className="px-2 py-0.5 text-[10px] bg-sky-950 text-sky-400 rounded border border-sky-800/60 font-bold">
                            Preview / Dry Run
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Started: {new Date(run.startedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-emerald-400 font-semibold">Synced: {run.syncedCount}</span>
                    <span className="text-slate-400">Skipped: {run.skippedCount}</span>
                    <span className="text-rose-400">Failed: {run.failedCount}</span>
                  </div>
                </div>

                {run.errorMessage && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{run.errorMessage}</span>
                  </div>
                )}

                {run.syncItems && run.syncItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-semibold text-slate-400">Synchronized Items:</div>
                    <div className="bg-slate-950/60 rounded-lg p-3 divide-y divide-slate-800/60 text-xs">
                      {run.syncItems.map((item) => (
                        <div key={item.id} className="py-1.5 flex items-center justify-between">
                          <div className="font-mono text-slate-300">
                            {item.title} ({item.language})
                            {item.githubPath && (
                              <span className="text-slate-500 font-sans text-[11px] block">{item.githubPath}</span>
                            )}
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            {item.githubCommitSha ? (
                              <span className="text-sky-400">{item.githubCommitSha.substring(0, 7)}</span>
                            ) : (
                              <span className="text-slate-500">{item.status}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
