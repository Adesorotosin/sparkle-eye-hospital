"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Stethoscope,
  Package,
  Calendar,
  Search,
  LogOut,
  ChevronDown,
  TestTube2,
} from "lucide-react";

type ActivePatient = {
  patientId: string;
  fullName: string;
  age?: number | null;
  gender?: string | null;
  allergies?: string | null;
};

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<ActivePatient | null>(null);

  useEffect(() => {
    const match = pathname?.match(/^\/doctor\/patients\/([^/]+)\/encounter/);
    const patientCode = match?.[1];

    if (!patientCode) {
      setActivePatient(null);
      return;
    }

    let cancelled = false;

    async function loadActivePatient() {
      try {
        const response = await fetch(
          `/api/patients/${encodeURIComponent(patientCode)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Unable to load active patient.");
        }

        const data = await response.json();

        if (!cancelled) {
          setActivePatient(data.patient ?? null);
        }
      } catch {
        if (!cancelled) {
          setActivePatient(null);
        }
      }
    }

    loadActivePatient();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    localStorage.removeItem("sparkle_staff_token");
    localStorage.clear();
    sessionStorage.clear();

    await fetch("/api/auth/logout", { method: "POST" });

    setProfileDropdownOpen(false);
    window.location.href = "/";
  };

  const navItems = [
    { name: "Overview", href: "/doctor", icon: LayoutDashboard },
    { name: "Patient Records", href: "/doctor/patients", icon: Users },
    { name: "Workflow Queue", href: "/doctor/kanban", icon: Kanban },
    { name: "Investigation Room", href: "/diagnostics", icon: TestTube2 },
    { name: "Surgical Suite", href: "/doctor/surgery", icon: Stethoscope },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Optical Inventory", href: "/inventory", icon: Package },
  ];

  const allergyItems = (activePatient?.allergies ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased">
      <aside className="w-72 bg-[#0B132B] text-white p-6 flex flex-col justify-between shrink-0 border-r border-slate-800 min-h-screen sticky top-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden border border-slate-800 flex items-center justify-center shrink-0 relative shadow-xs">
              <Image
                src="/Logo.png"
                alt="Sparkle Eye Hospital Logo"
                width={40}
                height={40}
                className="object-contain p-1"
                priority
              />
            </div>

            <div className="min-w-0">
              <h1 className="font-extrabold text-sm text-white tracking-tight leading-none truncate">
                Sparkle Eye Hospital
              </h1>
              <span className="text-[10px] text-purple-300 font-bold tracking-wider uppercase block mt-1">
                Physician &amp; Staff Portal
              </span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search patients... (⌘K)"
              onClick={() => router.push("/doctor/patients")}
              readOnly
              className="w-full bg-slate-900/85 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 cursor-pointer"
            />
          </div>

          <nav className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-3 block mb-2">
              Menu
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== "/doctor" &&
                  pathname?.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-purple-300" : "text-slate-400"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Active Patient
              </span>

              <span
                className={`w-2 h-2 rounded-full ${
                  activePatient ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
              />
            </div>

            {activePatient ? (
              <>
                <div>
                  <h2 className="font-bold text-xs text-white">
                    {activePatient.fullName}
                  </h2>

                  <p className="text-[11px] text-slate-400">
                    {activePatient.age != null ? `${activePatient.age}y` : "Age —"}
                    {" · "}
                    {activePatient.gender || "Gender —"}
                    {" · MRN: "}
                    {activePatient.patientId}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                  {allergyItems.length ? (
                    allergyItems.map((allergy) => (
                      <span
                        key={allergy}
                        className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-medium"
                      >
                        {allergy}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      No allergies recorded
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h2 className="font-bold text-xs text-white">No active patient</h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  Open a patient consultation to view the active patient here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-700 text-white font-bold text-xs flex items-center justify-center">
                  DR
                </div>

                <div className="text-left">
                  <span className="text-xs font-bold text-white block leading-tight">
                    Dr. Adams
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Ophthalmologist
                  </span>
                </div>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-[11px] font-bold text-slate-200">
                    Signed in as Dr. Adams
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    doc_adams@sparkleeyehospital.com
                  </p>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
