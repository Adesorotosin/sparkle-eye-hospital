"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  KeyRound,
  Lock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Real-time password criteria validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  // Dynamic strength calculation
  const getStrength = () => {
    const passed = [hasMinLength, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length;
    if (newPassword.length === 0) return { label: "", score: 0, color: "bg-slate-200" };
    if (passed <= 1) return { label: "Weak", score: 25, color: "bg-red-500", text: "text-red-500" };
    if (passed === 2) return { label: "Fair", score: 50, color: "bg-amber-500", text: "text-amber-500" };
    if (passed === 3) return { label: "Medium", score: 75, color: "bg-amber-500", text: "text-amber-500" };
    return { label: "Strong", score: 100, color: "bg-emerald-500", text: "text-emerald-600" };
  };

  const strength = getStrength();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    console.log("Updating password...");
  };

  return (
    <main className="min-h-screen w-full bg-slate-100/60 flex items-center justify-center p-4 md:p-8 font-sans antialiased">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/60 border border-slate-100">
        
        {/* Header with Logo & Badge */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Sparkle Eye Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                SPARKLE EYE
              </h2>
              <p className="text-[9px] font-semibold text-purple-600 tracking-wider uppercase mt-0.5">
                SPECIALIST HOSPITAL
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-md bg-purple-50 text-[#6D4AFF] text-[10px] font-bold tracking-wider uppercase border border-purple-100">
            FIRST SIGN-IN
          </span>
        </div>

        {/* Title & Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Secure Your Account
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Before continuing, we require a permanent password update to ensure patient record protection.
          </p>
        </div>

        {/* Temporary Warning Banner */}
        <div className="mb-6 p-4 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#6D4AFF] shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-[#6D4AFF] leading-snug">
            You are using temporary credentials. Please set a new password to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Current Temporary Password
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-800 placeholder-slate-400 transition"
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="ClinicalStaff9"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-800 placeholder-slate-400 transition"
              />
            </div>

            {/* Strength Meter */}
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between items-center text-[11px] font-medium mb-1">
                  <span className="text-slate-500">Password Strength:</span>
                  <span className={`font-semibold ${strength.text}`}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${strength.score}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-800 placeholder-slate-400 transition"
              />
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-800 mb-2">
              Security Requirements:
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className={`flex items-center gap-2 ${hasMinLength ? "text-slate-700" : "text-slate-500"}`}>
                {hasMinLength ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span>At least 8 characters long</span>
              </li>
              <li className={`flex items-center gap-2 ${hasUppercase ? "text-slate-700" : "text-slate-500"}`}>
                {hasUppercase ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span>Includes at least one uppercase letter</span>
              </li>
              <li className={`flex items-center gap-2 ${hasNumber ? "text-slate-700" : "text-slate-500"}`}>
                {hasNumber ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span>Includes at least one number</span>
              </li>
              <li className={`flex items-center gap-2 ${hasSpecialChar ? "text-slate-700" : "text-slate-500"}`}>
                {hasSpecialChar ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span>Includes at least one special character</span>
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#6D4AFF] hover:bg-[#5B3CE1] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#6D4AFF]/20 transition duration-150 mt-4"
          >
            Set New Password & Continue
          </button>
        </form>

        {/* Footer Note */}
        <p className="text-[11px] text-slate-400 text-center mt-6">
          Your session will begin after password update.
        </p>
      </div>
    </main>
  );
}