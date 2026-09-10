import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
      <p className="text-slate-600 mb-6 text-sm">
        You do not have permission to view this section or your session has expired.
      </p>
      <Link
        href="/login"
        className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-all"
      >
        Return to Login
      </Link>
    </div>
  );
}