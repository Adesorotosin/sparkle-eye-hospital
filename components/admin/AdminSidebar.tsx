"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AdminSidebarProps {
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

export default function AdminSidebar({
  collapsed = false,
  setCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Staff & Access Control", href: "/admin/access-control", icon: Users },
    { name: "Audit Logs", href: "/admin/audit", icon: ShieldAlert },
    { name: "Reports & Analytics", href: "/admin/reports", icon: BarChart3 },
    { name: "Notifications & Alerts", href: "/admin/notifications", icon: Bell },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    document.cookie = "is_logged_in=; path=/; max-age=0;";
    document.cookie = "user_role=; path=/; max-age=0;";
    localStorage.removeItem("sparkle_staff_token");
    window.location.href = "/";
  };

  return (
    <aside
      className={`bg-[#0F172A] text-slate-300 border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col justify-between z-40 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div>
        {/* Header & Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between min-h-[73px]">
          <Link
            href="/admin"
            className={`flex items-center gap-3 overflow-hidden ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Sparkle Eye Specialist Hospital Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            {!collapsed && (
              <div className="transition-opacity duration-200">
                <h1 className="font-bold text-base leading-tight text-white whitespace-nowrap">
                  Sparkle Eye
                </h1>
                <p className="text-[10px] tracking-wider text-purple-300 uppercase font-semibold whitespace-nowrap mt-0.5">
                  Specialist Hospital
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#6D4AFF] text-white font-semibold shadow-md shadow-[#6D4AFF]/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    active ? "text-white" : "text-slate-400"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate whitespace-nowrap">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Collapse Toggle */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed?.(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>

        {/* User Profile */}
        <div
          className={`flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-800/80 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
              alt="Dr. Alabi Benson"
              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
            />
            {!collapsed && (
              <div className="text-left truncate">
                <p className="text-xs font-semibold leading-tight text-white truncate">
                  Dr. Alabi Benson
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Chief Administrator
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}