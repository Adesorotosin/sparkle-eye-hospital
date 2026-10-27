"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Fixed Left Sidebar with Collapse State */}
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area (Dynamically offset based on sidebar state) */}
      <main
        className={`flex-1 min-h-screen transition-all duration-300 ${
          collapsed ? "pl-20" : "pl-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}