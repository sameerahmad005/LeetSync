"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Github,
  Code2,
  Layers,
  LogIn,
  Edit3,
  PlusCircle,
  FolderPlus,
  Lock,
  Globe,
} from "lucide-react";

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [repositories, setRepositories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedRepoOwner, setSelectedRepoOwner] = useState("");
  const [selectedRepoName, setSelectedRepoName] = useState("");
  const [customRepoMode, setCustomRepoMode] = useState(false);
  const [customRepoInput, setCustomRepoInput] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [rootDir, setRootDir] = useState("solutions");
  const [folderStructure, setFolderStructure] = useState("{rootDir}/{difficulty}/{problem-slug}");
  const [commitStrategy, setCommitStrategy] = useState<"BATCH" | "INDIVIDUAL">("BATCH");
  const [syncReadme, setSyncReadme] = useState(true);
  const [syncStats, setSyncStats] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState("DAILY");

  // Create New Repository Modal/State
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState("leetcode-solutions");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettingsAndRepos = async () => {
    try {
      setLoading(true);
      const [settingsRes, reposRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/repositories"),
      ]);

      if (settingsRes.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      let currentConfig: any = null;
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setLeetcodeUsername(data.leetcodeUsername || "");
        if (data.repositoryConfig) {
          currentConfig = data.repositoryConfig;
          setSelectedRepoOwner(data.repositoryConfig.repoOwner);
          setSelectedRepoName(data.repositoryConfig.repoName);
          setCustomRepoInput(`${data.repositoryConfig.repoOwner}/${data.repositoryConfig.repoName}`);
          setSelectedBranch(data.repositoryConfig.branch);
          setRootDir(data.repositoryConfig.rootDir);
          setFolderStructure(data.repositoryConfig.folderStructure);
          setCommitStrategy(data.repositoryConfig.commitStrategy || "BATCH");
          setSyncReadme(data.repositoryConfig.syncReadme);
          setSyncStats(data.repositoryConfig.syncStats);
          setAutoSyncEnabled(data.repositoryConfig.autoSyncEnabled);
          setSyncFrequency(data.repositoryConfig.syncFrequency || "DAILY");
        }
      }

      if (reposRes.ok) {
        const reposData = await reposRes.json();
        let fetchedRepos = reposData.repositories || [];

        // Ensure current selected repo is in the dropdown list if configured
        if (currentConfig && currentConfig.repoOwner && currentConfig.repoName) {
          const fullName = `${currentConfig.repoOwner}/${currentConfig.repoName}`;
          const exists = fetchedRepos.some((r: any) => r.fullName === fullName);
          if (!exists) {
            fetchedRepos = [
              {
                id: 0,
                name: currentConfig.repoName,
                owner: currentConfig.repoOwner,
                fullName,
                private: false,
                defaultBranch: currentConfig.branch || "main",
              },
              ...fetchedRepos,
            ];
          }
        }

        setRepositories(fetchedRepos);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndRepos();
  }, []);

  // Fetch branches when selected repo changes
  useEffect(() => {
    if (selectedRepoOwner && selectedRepoName) {
      fetch(`/api/repositories?owner=${selectedRepoOwner}&repo=${selectedRepoName}`)
        .then((res) => res.json())
        .then((data) => setBranches(data.branches || []))
        .catch(console.error);
    }
  }, [selectedRepoOwner, selectedRepoName]);

  const handleCreateRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;

    setCreatingRepo(true);
    setMessage(null);

    try {
      const res = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRepoName.trim(),
          isPrivate: newRepoPrivate,
          description: "LeetCode solutions synced automatically with LeetSync",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: `🎉 Created repository '${data.repository.fullName}' on GitHub and set as target!`,
        });
        setSelectedRepoOwner(data.repository.owner);
        setSelectedRepoName(data.repository.name);
        setCustomRepoInput(data.repository.fullName);
        setShowCreateRepoModal(false);
        setCustomRepoMode(false);
        loadSettingsAndRepos();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to create repository on GitHub." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred while creating repository." });
    } finally {
      setCreatingRepo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    let owner = selectedRepoOwner;
    let name = selectedRepoName;

    if (customRepoMode) {
      const parts = customRepoInput.split("/");
      if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        owner = parts[0].trim();
        name = parts[1].trim();
      } else {
        setMessage({
          type: "error",
          text: "Invalid custom repository format. Please enter as owner/repository (e.g. username/LeetCode-Solutions).",
        });
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leetcodeUsername,
          repoOwner: owner,
          repoName: name,
          branch: selectedBranch,
          rootDir,
          folderStructure,
          commitStrategy,
          syncReadme,
          syncStats,
          autoSyncEnabled,
          syncFrequency,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setMessage({
          type: "error",
          text: "Session expired or invalid. Please sign out and sign in again with GitHub.",
        });
        setIsAuthenticated(false);
      } else if (res.ok) {
        setSelectedRepoOwner(owner);
        setSelectedRepoName(name);
        setMessage({ type: "success", text: "Settings saved and repository access verified successfully!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
            Loading settings...
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
                Please sign in with your GitHub account to access settings and configure your repository synchronization.
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

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-400" />
            LeetSync Settings
          </h1>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border text-sm flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                : "bg-rose-950/60 border-rose-800 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div className="flex-1">{message.text}</div>
            {message.text.includes("Sign In") && (
              <a
                href="/api/auth/github"
                className="ml-auto px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded transition-colors"
              >
                Sign In
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* LeetCode Configuration */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-400" />
              LeetCode Account
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">LeetCode Username</label>
              <input
                type="text"
                value={leetcodeUsername}
                onChange={(e) => setLeetcodeUsername(e.target.value)}
                placeholder="e.g. leetcode_user"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Your public LeetCode username. LeetSync will fetch your recent accepted solutions.
              </p>
            </div>
          </div>

          {/* GitHub Repository Target */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Github className="w-5 h-5 text-purple-400" />
                Target GitHub Repository
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateRepoModal(true)}
                  className="text-xs px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Create New Repo on GitHub
                </button>
                <button
                  type="button"
                  onClick={() => setCustomRepoMode(!customRepoMode)}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {customRepoMode ? "Choose from Repositories" : "Manual Repo Input"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Repository {customRepoMode ? "(Owner/Repository)" : "(Select)"}
                </label>

                {customRepoMode ? (
                  <input
                    type="text"
                    value={customRepoInput}
                    onChange={(e) => setCustomRepoInput(e.target.value)}
                    placeholder="e.g. username/LeetCode-Solutions"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                ) : (
                  <select
                    value={`${selectedRepoOwner}/${selectedRepoName}`}
                    onChange={(e) => {
                      const [owner, name] = e.target.value.split("/");
                      setSelectedRepoOwner(owner || "");
                      setSelectedRepoName(name || "");
                      setCustomRepoInput(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {repositories.length === 0 ? (
                      <option value="">No repositories found (Click Create New Repo above)</option>
                    ) : (
                      repositories.map((repo) => (
                        <option key={repo.id || repo.fullName} value={repo.fullName}>
                          {repo.fullName} {repo.private ? "(Private)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  {branches.length === 0 ? (
                    <option value="main">main</option>
                  ) : (
                    branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Repository Structure Settings */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              Folder Structure & Commit Strategy
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Root Directory</label>
                <input
                  type="text"
                  value={rootDir}
                  onChange={(e) => setRootDir(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Folder Pattern</label>
                <input
                  type="text"
                  value={folderStructure}
                  onChange={(e) => setFolderStructure(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Commit Strategy</label>
              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="commitStrategy"
                    value="BATCH"
                    checked={commitStrategy === "BATCH"}
                    onChange={() => setCommitStrategy("BATCH")}
                    className="text-sky-500"
                  />
                  <span>
                    <strong>Batch Commits</strong> (Recommended: 1 Git commit per sync run)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="commitStrategy"
                    value="INDIVIDUAL"
                    checked={commitStrategy === "INDIVIDUAL"}
                    onChange={() => setCommitStrategy("INDIVIDUAL")}
                    className="text-sky-500"
                  />
                  <span>
                    <strong>Individual Commits</strong> (1 commit per solution)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={syncReadme}
                  onChange={(e) => setSyncReadme(e.target.checked)}
                  className="rounded text-sky-500"
                />
                <span>Generate individual problem README.md files</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={syncStats}
                  onChange={(e) => setSyncStats(e.target.checked)}
                  className="rounded text-sky-500"
                />
                <span>Update repository README.md statistics block (LEETSYNC:START)</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </main>

      {/* Create New Repository Modal */}
      {showCreateRepoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-purple-400" />
                Create New Repository on GitHub
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateRepoModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRepoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Repository Name</label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="e.g. leetcode-solutions"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Will be created under your authenticated GitHub account.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Visibility</label>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="repoVisibility"
                      checked={!newRepoPrivate}
                      onChange={() => setNewRepoPrivate(false)}
                      className="text-purple-500"
                    />
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Public</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="repoVisibility"
                      checked={newRepoPrivate}
                      onChange={() => setNewRepoPrivate(true)}
                      className="text-purple-500"
                    />
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Private</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateRepoModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRepo}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {creatingRepo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Creating on GitHub...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" /> Create & Target Repo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
