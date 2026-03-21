"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email: string, pass: string) => {
    setEmail(email);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-purple-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">HR Portal</h1>
                <p className="text-[10px] text-indigo-300/60 font-medium tracking-wider uppercase">Enterprise</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Manage your<br />workforce with<br />confidence
            </h2>
            <p className="text-indigo-200/80 text-sm max-w-md leading-relaxed">
              Streamline HR operations, manage leave workflows, track attendance, and empower your organization with a modern people management platform.
            </p>

            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                { label: "Leave Management", desc: "Multi-step approvals" },
                { label: "Attendance", desc: "Real-time tracking" },
                { label: "Employee Hub", desc: "Complete profiles" },
              ].map((f) => (
                <div key={f.label} className="bg-white/8 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-xs font-semibold text-white">{f.label}</p>
                  <p className="text-[11px] text-indigo-200/60 mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-indigo-300/40">&copy; 2026 HR Portal. Enterprise Human Resources.</p>
        </div>

        {/* Decorative */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -right-10 top-40 w-60 h-60 rounded-full bg-white/3" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-white/5" />
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">HR Portal</h1>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm ring-1 ring-red-100">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : "Sign In"}
              </button>
            </form>

            {/* Quick Login */}
            <div className="mt-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Quick access - Demo accounts</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Admin", email: "admin@datasafeguard.us", pass: "admin123", color: "bg-purple-50 text-purple-700 ring-purple-100" },
                  { label: "HR Admin", email: "hr@datasafeguard.us", pass: "hr123", color: "bg-blue-50 text-blue-700 ring-blue-100" },
                  { label: "Manager", email: "manager@datasafeguard.us", pass: "manager123", color: "bg-amber-50 text-amber-700 ring-amber-100" },
                  { label: "Employee", email: "employee@datasafeguard.us", pass: "employee123", color: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
                ].map((acc) => (
                  <button
                    key={acc.label}
                    onClick={() => quickLogin(acc.email, acc.pass)}
                    className={`text-xs font-medium py-2 px-3 rounded-xl ring-1 transition-all hover:shadow-sm ${acc.color}`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
