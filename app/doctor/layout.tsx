"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Stethoscope, 
  CreditCard,
  Package,
  Calendar,
  Bell, 
  Search, 
  LogOut, 
  ChevronDown, 
  Sparkles
} from "lucide-react";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleSignOut = () => {
    // 1. Clear tokens & client storage
    localStorage.removeItem("sparkle_staff_token");
    localStorage.clear();
    sessionStorage.clear();

    // 2. Clear auth cookies read by middleware.ts
    document.cookie = "is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";

    // 3. Close dropdown
    setProfileDropdownOpen(false);

    // 4. Perform hard redirect to root login page ("/")
    window.location.href = "/";
  };

  const navItems = [
    { name: "Overview", href: "/doctor", icon: LayoutDashboard },
    { name: "Patient Records", href: "/doctor/patients", icon: Users },
    { name: "Workflow Queue", href: "/doctor/kanban", icon: Kanban },
    { name: "Surgical Suite", href: "/doctor/patients/20458712/surgery", icon: Stethoscope },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Optical Inventory", href: "/inventory", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased">
      
      {/* GLOBAL APPLICATION SIDEBAR */}
      <aside className="w-72 bg-[#0B132B] text-white p-6 flex flex-col justify-between shrink-0 border-r border-slate-800 min-h-screen sticky top-0">
        <div className="space-y-6">
          {/* Hospital Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-tight">
                Sparkle Eye Hospital
              </h1>
              <span className="text-[10px] text-purple-300 font-bold tracking-wider uppercase">
                Physician &amp; Staff Portal
              </span>
            </div>
          </div>

          {/* Quick Search inside Sidebar */}
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

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-3 block mb-2">
              Menu
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
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
                  <Icon className={`w-4 h-4 ${isActive ? "text-purple-300" : "text-slate-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* ACTIVE PATIENT CARD RETAINED IN SIDEBAR */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Patient</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div>
              <h2 className="font-bold text-xs text-white">Margaret Chen</h2>
              <p className="text-[11px] text-slate-400">68F · MRN: #20458712</p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-medium">Penicillin Allergy</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-medium">Sulfa Allergy</span>
            </div>
          </div>
        </div>

        {/* Sidebar Footer / User Account Profile Snippet */}
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
                  <span className="text-xs font-bold text-white block leading-tight">Dr. Adams</span>
                  <span className="text-[10px] text-slate-400">Ophthalmologist</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-[11px] font-bold text-slate-200">Signed in as Dr. Adams</p>
                  <p className="text-[10px] text-slate-400 truncate">doc_adams@sparkleeyehospital.com</p>
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

      {/* MAIN VIEWPORT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP STREAMLINED HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient records, charts, or orders... (⌘K)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 transition"
              />
              <span className="absolute right-2.5 top-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                ⌘K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* CHILD PAGE CONTENT */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}