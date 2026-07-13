"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearSession, isAuthenticated, type AuthUser } from "@/lib/auth";
import {
  LogOut, Sun, Moon, Activity, ChevronDown,
  Shield, User, Settings, Mic
} from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export function AuthGuard({ children }: Props) {
  const router   = useRouter();
  const [user,   setUser]   = useState<AuthUser | null>(null);
  const [dark,   setDark]   = useState(false);
  const [menu,   setMenu]   = useState(false);
  const [ready,  setReady]  = useState(false);

  // Apply dark class directly to <html> — this is how Tailwind dark: works
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setUser(getUser());

    const saved = localStorage.getItem("ss_dark_mode");
    const isDark = saved === "true";
    setDark(isDark);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    setReady(true);
  }, [router]);

  const toggleDark = useCallback(() => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem("ss_dark_mode", String(next));
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    document.documentElement.classList.remove("dark");
    router.replace("/login");
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center animate-pulse">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading workspace…</p>
        </div>
      </div>
    );
  }

  const ROLE_COLOR: Record<string, string> = {
    admin:  "bg-violet-500/15 text-violet-400 border-violet-500/20",
    staff:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
    doctor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fb] dark:bg-[#0d1421] text-slate-900 dark:text-slate-100 transition-colors duration-200">

      {/* ── Sticky Top Navbar ──────────────────────────────────────────── */}
      <header className="h-[52px] flex items-center justify-between px-5 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#0f1a28] sticky top-0 z-50 flex-shrink-0">

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow shadow-blue-600/30">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">
              Settlement Sense
            </span>
            <span className="text-[9px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 ml-1">
              OS
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 mx-1 bg-slate-200 dark:bg-white/10" />
          <span className="hidden sm:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Hospital Workspace
          </span>
        </div>

        {/* ── Center Nav Links ─────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/appointments" label="Appointments" />
          <NavLink href="/admin/ai-receptionist" label="AI Receptionist" icon={Mic} />
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle — always visible border + colored icon */}
          <button
            id="dark-mode-toggle"
            onClick={toggleDark}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border border-slate-200 dark:border-white/10 bg-white dark:bg-white/6 hover:bg-slate-50 dark:hover:bg-white/12 text-amber-500 dark:text-amber-400"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => setMenu(!menu)}
              className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-white/8"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">{user?.initials ?? "U"}</span>
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-[11px] font-semibold leading-none text-slate-700 dark:text-slate-200">
                  {user?.name ?? "User"}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider leading-none mt-0.5 text-slate-400 dark:text-slate-500">
                  {user?.role ?? "staff"}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${menu ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-[calc(100%+6px)] w-52 rounded-xl border shadow-2xl z-50 overflow-hidden bg-white dark:bg-[#131f2e] border-slate-200 dark:border-white/8">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-white/8">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white">{user?.initials ?? "U"}</span>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ROLE_COLOR[user?.role ?? "staff"]}`}>
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      {user?.role}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <DropItem icon={User}     label="My Profile" onClick={() => setMenu(false)} />
                    <DropItem icon={Settings} label="Settings"   onClick={() => setMenu(false)} />
                    <div className="my-1 border-t border-slate-100 dark:border-white/8" />
                    <DropItem icon={LogOut}   label="Sign Out" danger onClick={handleLogout} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href, label, icon: Icon,
}: {
  href: string;
  label: string;
  icon?: React.ElementType;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8 transition-all"
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </a>
  );
}

function DropItem({
  icon: Icon, label, danger, onClick,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
        danger
          ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </button>
  );
}
