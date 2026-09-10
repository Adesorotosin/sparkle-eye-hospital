"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Eye, User, Lock, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import Image from "next/image";
import { authenticateStaff, ROLE_REDIRECT_MAP } from "@/lib/auth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberWorkstation, setRememberWorkstation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // 1. Authenticate credentials via API
      const user = await authenticateStaff(username, password);

      // 2. Set client cookies (enforce uppercase role & SameSite safety)
      const formattedRole = String(user.role).toUpperCase();
      document.cookie = "is_logged_in=true; path=/; max-age=86400; SameSite=Lax";
      document.cookie = `user_role=${formattedRole}; path=/; max-age=86400; SameSite=Lax`;

      // 3. Save token client-side if requested
      if (rememberWorkstation) {
        localStorage.setItem("sparkle_staff_token", user.token);
      }

      // 4. Determine target route based on role (fallback to existing /doctor route)
      const targetRoute = ROLE_REDIRECT_MAP[user.role] || "/doctor";

      // 5. Hard refresh to send new cookies directly to middleware
      window.location.href = targetRoute;
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid username or password. Please check your credentials.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row bg-white font-sans antialiased">
      {/* LEFT PANEL - Branding & Server Status */}
      <div className="w-full md:w-[40%] lg:w-[35%] bg-[#222222] text-white p-8 lg:p-12 flex flex-col justify-between min-h-[300px] md:min-h-screen">
        {/* Logo Header */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="Sparkle Eye Specialist Hospital Logo"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white leading-none">
              Sparkle
            </h2>
            <p className="text-[11px] font-semibold tracking-wider text-purple-300 uppercase mt-1">
              Eye Specialist Hospital
            </p>
          </div>
        </div>

        {/* Hero Banner Text */}
        <div className="my-auto py-12">
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-4 text-white">
            In-House Hospital <br /> Management System
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
            Authorized Personnel Only. All activities are monitored, logged,
            and subject to periodic clinical compliance audits.
          </p>
        </div>

        {/* Server Status Badge */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-medium text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Operational | Local Server Online</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Staff Login Form */}
      <div className="w-full md:w-[60%] lg:w-[65%] bg-slate-50/50 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
          
          {/* Card Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1.5">
              Staff Login
            </h2>
            <p className="text-xs text-slate-500">
              Please enter your security credentials to access your portal.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Username or Staff ID
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  suppressHydrationWarning
                  placeholder="e.g. admin, doc_adams, cashier1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-800 placeholder-slate-400 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  suppressHydrationWarning
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-800 placeholder-slate-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox & Forgot Link */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberWorkstation}
                  onChange={(e) => setRememberWorkstation(e.target.checked)}
                  className="w-4 h-4 rounded text-[#6D4AFF] focus:ring-[#6D4AFF] border-slate-300 accent-[#6D4AFF]"
                />
                Remember workstation
              </label>
              <Link
                href="/reset-password"
                className="text-[#6D4AFF] hover:text-[#5B3CE1] font-semibold transition"
              >
                Forgot Password / Reset Pin
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#6D4AFF] hover:bg-[#5B3CE1] active:bg-[#4C2ECC] disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl shadow-md shadow-[#6D4AFF]/25 transition duration-150 ease-in-out mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Security Footer Badge */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Role-Based Access Enforced • Audit Trail Active</span>
          </div>
        </div>
      </div>
    </main>
  );
}