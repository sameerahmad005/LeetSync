"use client";

import { useEffect, useState, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  GitBranch,
  Github,
  Code2,
  ExternalLink,
  Clock,
  Layers,
  LogIn,
  Zap,
  Copy,
  Check,
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  leetcodeUsername?: string;
}

interface StatsData {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  languages: Record<string, number>;
}

interface RecentSubmission {
  id: string;
  title: string;
  problemSlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  normalizedLanguage: string;
  submittedAt: string;
  status: string;
}

interface DryRunItem {
  submissionId: string;
  problemSlug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  language: string;
  status: "NEW" | "ALREADY_SYNCED" | "UNSUPPORTED";
  targetPath: string;
}

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [repoConfig, setRepoConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [dryRunItems, setDryRunItems] = useState<DryRunItem[] | null>(null);

  // Instant Watch Mode & Instant Webhook Modal state
  const [instantWatchMode, setInstantWatchMode] = useState(false);
  const [showInstantModal, setShowInstantModal] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const watchIntervalRef = useRef<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, statsRes, settingsRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/statistics"),
        fetch("/api/settings"),
      ]);

      if (userRes.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.statistics);
        setRecentSubmissions(statsData.recentSubmissions || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setRepoConfig(settingsData.repositoryConfig);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Instant Watch Mode: Polls /api/sync every 30 seconds when enabled
  useEffect(() => {
    if (instantWatchMode) {
      watchIntervalRef.current = setInterval(() => {
        handleSyncNow(true);
      }, 30000);
    } else if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
    }

    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
  }, [instantWatchMode]);

  const handleSyncNow = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setIsSyncing(true);
        setSyncMessage("Initiating instant synchronization...");
      }

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDryRun: false }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (!isBackground) setSyncMessage(`Error: ${data.error || "Sync failed"}`);
      } else {
        if (data.syncedCount > 0) {
          setSyncMessage(
            `🎉 Instant Sync Completed: Synced ${data.syncedCount} new solution(s) to GitHub!`
          );
        } else if (!isBackground) {
          setSyncMessage(
            `Sync ${data.status}: All accepted solutions are already up to date (${data.skippedCount ?? 0} skipped).`
          );
        }
        fetchData();
      }
    } catch (err: any) {
      if (!isBackground) setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      if (!isBackground) setIsSyncing(false);
    }
  };

  const handlePreviewSync = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage("Generating sync preview...");

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDryRun: true }),
      });

      const data = await res.json();
      if (res.ok && data.previewItems) {
        setDryRunItems(data.previewItems);
        setSyncMessage(`Preview loaded: Found ${data.previewItems.length} accepted submissions.`);
      } else {
        setSyncMessage(`Preview failed: ${data.error || "Unable to generate preview"}`);
      }
    } catch (err: any) {
      setSyncMessage(`Preview error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const webhookUrl = user
    ? `${typeof window !== "undefined" ? window.location.origin : "https://leet-sync-mauve.vercel.app"}/api/sync?userId=${user.id}`
    : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
            Loading LeetSync dashboard...
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
                Please sign in with your GitHub account to access your LeetSync dashboard and statistics.
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-xl border border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Welcome back, {user?.name || user?.username || "Developer"}
            </h1>
            <p className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>LeetSync is monitoring your LeetCode profile and committing solutions to GitHub.</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                Daily Automatic Cron Active
              </span>
              {instantWatchMode && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 animate-pulse" />
                  Instant Watch Mode (Checking every 30s)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowInstantModal(true)}
              className="px-3.5 py-2 bg-amber-950/70 hover:bg-amber-900 text-amber-300 text-sm font-semibold rounded-lg border border-amber-800/80 transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              Instant Sync Setup
            </button>
            <button
              onClick={() => setInstantWatchMode(!instantWatchMode)}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                instantWatchMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
            >
              <Zap className={`w-4 h-4 ${instantWatchMode ? "text-amber-400 animate-bounce" : "text-slate-400"}`} />
              {instantWatchMode ? "Disable Watch Mode" : "Enable Watch Mode (30s)"}
            </button>
            <button
              onClick={handlePreviewSync}
              disabled={isSyncing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-slate-400" />
              Preview
            </button>
            <button
              onClick={() => handleSyncNow(false)}
              disabled={isSyncing}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>

        {/* Sync Message Notification */}
        {syncMessage && (
          <div className="p-4 rounded-lg bg-sky-950/70 border border-sky-800/80 text-sky-200 text-sm flex items-center justify-between">
            <span>{syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} className="text-sky-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Connection Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-slate-800/80 rounded-lg text-slate-300">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">GitHub Account</div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5 mt-0.5">
                <span>@{user?.username || "Connected"}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-amber-950/40 rounded-lg text-amber-400">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">LeetCode Profile</div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5 mt-0.5">
                {user?.leetcodeUsername ? (
                  <>
                    <span>{user.leetcodeUsername}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </>
                ) : (
                  <>
                    <span className="text-amber-400">Not Configured</span>
                    <XCircle className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-purple-950/40 rounded-lg text-purple-400">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Target Repository</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {repoConfig?.repoOwner && repoConfig?.repoName ? (
                  `${repoConfig.repoOwner}/${repoConfig.repoName} (${repoConfig.branch || "main"})`
                ) : (
                  <span className="text-amber-400 text-xs font-normal">Not Configured (Go to Settings)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Synchronization Statistics
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Total Solved</div>
              <div className="text-3xl font-extrabold text-white mt-1">{stats?.total || 0}</div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-emerald-400 font-medium">🟢 Easy</div>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">{stats?.easy || 0}</div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-amber-400 font-medium">🟡 Medium</div>
              <div className="text-3xl font-extrabold text-amber-400 mt-1">{stats?.medium || 0}</div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-rose-400 font-medium">🔴 Hard</div>
              <div className="text-3xl font-extrabold text-rose-400 mt-1">{stats?.hard || 0}</div>
            </div>
          </div>
        </div>

        {/* Dry-Run Modal Preview if open */}
        {dryRunItems && (
          <div className="bg-slate-900 border border-sky-800/80 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-400" />
                Sync Preview ({dryRunItems.length} Submissions Found)
              </h3>
              <button
                onClick={() => setDryRunItems(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
              >
                Close Preview
              </button>
            </div>

            <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
              {dryRunItems.map((item) => (
                <div key={item.submissionId} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200">{item.title}</span>
                    <span className="text-slate-400 ml-2">({item.language})</span>
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">{item.targetPath}</div>
                  </div>
                  <div>
                    {item.status === "NEW" ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
                        + Ready to Sync
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        Already Synced
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Synchronized Solutions List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            Recent Synchronized Problems
          </h2>

          <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
            {recentSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No synchronized solutions found yet. Click &quot;Sync Now&quot; to fetch your LeetCode submissions!
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-sm flex items-center gap-2">
                        <span>{sub.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            sub.difficulty === "EASY"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              : sub.difficulty === "MEDIUM"
                              ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                              : "bg-rose-950 text-rose-400 border border-rose-800/50"
                          }`}
                        >
                          {sub.difficulty}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Language: {sub.normalizedLanguage}</span>
                        <span>•</span>
                        <span>Date: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <a
                      href={`https://leetcode.com/problems/${sub.problemSlug}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 hover:underline"
                    >
                      LeetCode
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Instant Sync Setup Modal */}
      {showInstantModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Instant Auto-Sync Setup
              </h3>
              <button
                type="button"
                onClick={() => setShowInstantModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <p>
                To achieve <strong>instant synchronization</strong> right when you hit &quot;Accepted&quot; on LeetCode, choose one of the options below:
              </p>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="font-semibold text-white text-sm flex items-center gap-2">
                  <span>Option 1: Enable Watch Mode on Dashboard</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold">1-Click</span>
                </div>
                <p className="text-slate-400">
                  Keep the LeetSync dashboard open while solving LeetCode problems and toggle <strong>&quot;Enable Watch Mode&quot;</strong> at the top right. It automatically checks and commits new solutions every 30 seconds in real time!
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="font-semibold text-white text-sm flex items-center gap-2">
                  <span>Option 2: Instant Webhook URL (For Browser Scripts / Extensions)</span>
                </div>
                <p className="text-slate-400">
                  Use your personal Webhook URL to trigger an instant sync from any browser script or extension:
                </p>
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800 font-mono text-[11px] text-sky-400 break-all">
                  <span className="flex-1">{webhookUrl}</span>
                  <button
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowInstantModal(false)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-sky-600/20"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
