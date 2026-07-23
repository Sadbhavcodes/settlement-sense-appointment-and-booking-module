"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield, ArrowRight, Loader2, Activity, Sun, Moon } from "lucide-react";
import { saveSession, isAuthenticated } from "@/lib/auth";

type Mode = "login" | "register";

const ROLES = [
  { value: "admin",  label: "Administrator",  desc: "Full hospital access" },
  { value: "staff",  label: "Front Desk Staff", desc: "Appointments & patient intake" },
  { value: "doctor", label: "Doctor",          desc: "Clinical portal access" },
];

export default function LoginPage() {
  const router = useRouter();

  const [mode,       setMode]       = useState<Mode>("login");
  const [dark,       setDark]       = useState(true);
  const [showPw,     setShowPw]     = useState(false);
  const [showCpw,    setShowCpw]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");

  // Form fields
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [role,     setRole]     = useState("staff");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) router.replace("/appointments");
  }, [router]);

  // Persist dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem("ss_dark_mode");
    if (saved !== null) setDark(saved === "true");
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      localStorage.setItem("ss_dark_mode", String(!d));
      return !d;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "register") {
      if (password !== confirm) { setError("Passwords do not match"); return; }
      if (password.length < 6)  { setError("Password must be at least 6 characters"); return; }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> =
        mode === "login"
          ? { email, password }
          : { name, email, password, role };

      const res  = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      saveSession(data.token, data.user);

      if (mode === "register") {
        setSuccess(`Account created! Redirecting…`);
        setTimeout(() => router.replace("/appointments"), 1200);
      } else {
        router.replace("/appointments");
      }
    } catch {
      setError("Cannot reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Theme tokens ──────────────────────────────────────────────────── */
  const bg      = dark ? "bg-[#0a0f1e]"       : "bg-[#f0f4ff]";
  const card    = dark ? "bg-[#111827]/80"     : "bg-white/90";
  const border  = dark ? "border-white/10"     : "border-slate-200";
  const text    = dark ? "text-slate-100"      : "text-slate-900";
  const muted   = dark ? "text-slate-400"      : "text-slate-500";
  const input   = dark
    ? "bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/10";
  const label   = dark ? "text-slate-400"      : "text-slate-600";

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center relative overflow-hidden transition-colors duration-300`}>

      {/* ── Animated background orbs ──────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 ${dark ? "bg-blue-600" : "bg-blue-400"} animate-pulse`} />
        <div className={`absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full blur-3xl opacity-15 ${dark ? "bg-indigo-600" : "bg-indigo-300"} animate-pulse`} style={{ animationDelay: "1.5s" }} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-[0.04] ${dark ? "bg-cyan-400" : "bg-cyan-200"}`} />
      </div>

      {/* ── Dark mode toggle ──────────────────────────────────────────── */}
      <button
        onClick={toggleDark}
        className={`absolute top-5 right-5 z-50 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          dark ? "bg-white/10 hover:bg-white/15 text-slate-300" : "bg-black/10 hover:bg-black/15 text-slate-600"
        }`}
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <div className={`relative z-10 w-full max-w-[420px] mx-4 ${card} backdrop-blur-xl border ${border} rounded-2xl shadow-2xl overflow-hidden`}>

        {/* Top accent stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600" />

        <div className="px-8 py-8">

          {/* ── Logo + brand ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-[15px] font-bold tracking-tight leading-none ${text}`}>Settlement Sense</p>
              <p className={`text-[10px] font-semibold tracking-widest uppercase mt-0.5 ${muted}`}>Operating System</p>
            </div>
          </div>

          {/* ── Heading ──────────────────────────────────────────────── */}
          <div className="mb-6">
            <h1 className={`text-[22px] font-bold leading-tight ${text}`}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className={`text-[13px] mt-1 ${muted}`}>
              {mode === "login"
                ? "Sign in to your hospital workspace"
                : "Register a new staff or admin account"}
            </p>
          </div>

          {/* ── Mode switcher ────────────────────────────────────────── */}
          <div className={`flex rounded-xl p-1 mb-6 gap-1 ${dark ? "bg-white/5" : "bg-slate-100"}`}>
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all ${
                  mode === m
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : `${muted} hover:${text}`
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* ── Form ─────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full name — register only */}
            {mode === "register" && (
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${label}`}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sarah Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={`w-full h-11 px-3.5 text-[13px] font-medium border rounded-xl outline-none transition-all ring-2 ring-transparent ${input}`}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${label}`}>Email Address</label>
              <input
                type="email"
                placeholder="you@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full h-11 px-3.5 text-[13px] font-medium border rounded-xl outline-none transition-all ring-2 ring-transparent ${input}`}
              />
            </div>

            {/* Password */}
            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${label}`}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "login" ? "Your password" : "Min 6 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full h-11 px-3.5 pr-10 text-[13px] font-medium border rounded-xl outline-none transition-all ring-2 ring-transparent ${input}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-blue-500 transition-colors`}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password — register only */}
            {mode === "register" && (
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${label}`}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showCpw ? "text" : "password"}
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className={`w-full h-11 px-3.5 pr-10 text-[13px] font-medium border rounded-xl outline-none transition-all ring-2 ring-transparent ${input}`}
                  />
                  <button type="button" onClick={() => setShowCpw(!showCpw)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-blue-500 transition-colors`}>
                    {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Role — register only */}
            {mode === "register" && (
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${label}`}>Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                        role === r.value
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : `${border} ${muted} hover:border-blue-400`
                      }`}
                    >
                      <p className="text-[11px] font-bold">{r.label}</p>
                      <p className="text-[9px] mt-0.5 opacity-70 leading-tight">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error / Success banners */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 text-[12px] font-medium px-3.5 py-2.5 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[12px] font-medium px-3.5 py-2.5 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              id="auth-submit-btn"
              className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-4 h-4" />
                  </>
              }
            </button>

            {/* Demo hint */}
            {mode === "login" && (
              <p className={`text-center text-[11px] ${muted} pt-1`}>
                Demo: <button type="button" onClick={() => { setEmail("admin@settlementsense.com"); setPassword("admin123"); }}
                  className="text-blue-500 hover:underline font-medium">admin@settlementsense.com</button> / admin123
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className={`px-8 py-4 border-t ${border} flex items-center justify-between`}>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`text-[10px] font-semibold ${muted}`}>HIPAA Compliant</span>
          </div>
          <span className={`text-[10px] ${muted}`}>Settlement Sense OS v2.0</span>
        </div>
      </div>
    </div>
  );
}
