"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAuditLogsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/audit");
  }, [router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center p-6">
      <p className="text-sm text-slate-500">Opening the current Activity & Audit workspace…</p>
    </main>
  );
}
