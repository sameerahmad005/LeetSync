"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code, History, Settings, LogOut, Github } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Code },
    { href: "/history", label: "Sync History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-sky-600/30">
              LS
            </div>
            <span>LeetSync</span>
          </Link>
          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive
                      ? "bg-slate-800 text-sky-400 border border-slate-700/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {!loading && user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 font-medium hidden sm:inline">@{user.username}</span>
              <a
                href="/api/auth/logout"
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md border border-slate-800 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </a>
            </div>
          ) : !loading ? (
            <a
              href="/api/auth/github"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md shadow transition-colors flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              Sign In with GitHub
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
