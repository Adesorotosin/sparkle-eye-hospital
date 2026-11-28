"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Activity,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface SessionLockModalProps {
  onUnlock?: () => void;
  lastActiveAt?: number | null;
  timeoutMinutes?: number;
}

interface StaffProfile {
  name?: string | null;
  role?: string | null;
  title?: string | null;
  department?: string | null;
  customRoleName?: string | null;
}

function getActiveModule(pathname: string) {
  const routeLabels: Array<[string, string]> = [
    ["/admin/roles", "Role Management"],
    ["/admin/patient-access", "Patient Access Management"],
    ["/admin/procedure-prices", "Procedure & Price Management"],
    ["/admin/billing-settings", "Billing Settings"],
    ["/admin/reports", "Hospital Reports"],
    ["/admin/audit", "Audit & Compliance"],
    ["/admin/notifications", "Notifications"],
    ["/admin/settings", "Hospital Settings"],
    ["/admin", "Administration"],
    ["/doctor", "Doctor's Workspace"],
    ["/receptionist", "Reception"],
    ["/cashier", "Cashier"],
    ["/pharmacy", "Pharmacy"],
    ["/nurse", "Nursing"],
    ["/triage", "Triage"],
    ["/optometry", "Optometry"],
    ["/optician", "Optical Services"],
    ["/laboratory", "Laboratory"],
    ["/diagnostics", "Diagnostics"],
    ["/billing", "Billing"],
    ["/appointments", "Appointments"],
    ["/audit", "Audit & Compliance"],
    ["/emr", "Electronic Medical Records"],
    ["/inventory", "Inventory"],
    ["/consultation", "Consultation"],
  ];

  return routeLabels.find(([prefix]) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.[1] ?? "Hospital Workspace";
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SE";
}

export default function SessionLockScreen({
  onUnlock,
  lastActiveAt,
  timeoutMinutes = 5,
}: SessionLockModalProps) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  const [error, setError] = useState("");

  const activeModule = useMemo(
    () => getActiveModule(pathname || "/"),
    [pathname]
  );

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load staff profile.");
        return response.json();
      })
      .then((data) => {
        if (active) setProfile(data?.user ?? null);
      })
      .catch(() => {
        if (active) setProfile(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const staffName = profile?.name?.trim() || "Signed-in staff member";
  const roleLabel =
    profile?.customRoleName?.trim() ||
    profile?.title?.trim() ||
    profile?.role?.replace(/_/g, " ") ||
    "Hospital Staff";
  const lastActiveLabel = lastActiveAt
    ? `Last active about ${Math.max(1, Math.floor((Date.now() - lastActiveAt) / 60_000))} minute(s) ago`
    : "Your workstation session is paused";

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim() || isUnlocking) return;

    setIsUnlocking(true);
    setError("");

    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || "Unable to verify your password. Please try again.");
        return;
      }

      setPassword("");
      onUnlock?.();
    } catch {
      setError("Connection problem. Check your network and try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSwitchUser = async () => {
    if (isSwitchingUser) return;
    setIsSwitchingUser(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to sign out. Please try again.");
      }

      localStorage.removeItem("sparkle_staff_token");
      sessionStorage.clear();
      window.location.assign("/");
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "Unable to switch user right now."
      );
      setIsSwitchingUser(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-[#071226] px-4 py-8 font-sans antialiased">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_55%)]" />
      </div>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-lock-title"
        className="relative w-full max-w-[440px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_32px_100px_rgba(0,0,0,0.38)]"
      >
        <div className="flex flex-col items-center px-7 pb-7 pt-8 text-center sm:px-9 sm:pb-8 sm:pt-9">
          <Image
            src="/Logo.png"
            alt="Sparkle Eye Hospital"
            width={172}
            height={76}
            priority
            className="mb-5 h-[66px] w-[172px] object-contain"
          />

          <div className="mb-5 flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-800">
            <LockKeyhole className="h-3.5 w-3.5" />
            Workstation locked
          </div>

          <div className="mb-3 flex h-[68px] w-[68px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-extrabold tracking-wide text-[#172554] shadow-sm">
            {getInitials(staffName)}
          </div>

          <h1 id="session-lock-title" className="text-[23px] font-bold tracking-tight text-slate-950">
            {staffName}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{roleLabel}</p>
          {profile?.department && (
            <p className="mt-0.5 text-xs text-slate-400">{profile.department}</p>
          )}

          <div className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                Active module
              </p>
              <p className="truncate text-sm font-bold text-slate-800">{activeModule}</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="mt-6 w-full space-y-3 text-left">
            <label htmlFor="session-unlock-password" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Enter your password to resume
            </label>
            <div className="relative">
              <input
                id="session-unlock-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError("");
                }}
                placeholder="Your account password"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!password || isUnlocking}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#172554] px-4 text-sm font-bold text-white shadow-lg shadow-indigo-950/15 transition hover:bg-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ShieldCheck className="h-4 w-4" />
              {isUnlocking ? "Verifying…" : "Unlock workstation"}
            </button>
          </form>

          <div className="mt-5 flex w-full items-center justify-center">
            <button
              type="button"
              onClick={handleSwitchUser}
              disabled={isSwitchingUser}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-indigo-700 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isSwitchingUser ? "Signing out…" : "Switch user"}
            </button>
          </div>

          <div className="mt-6 w-full border-t border-slate-100 pt-4">
            <p className="text-[11px] font-medium text-slate-400">{lastActiveLabel}</p>
            <p className="mt-1 text-[10px] text-slate-400">
              Automatically locked after {timeoutMinutes} minutes of inactivity
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              Need assistance? Contact your hospital IT administrator.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
