"use client";

import React, { useState } from "react";
import { Lock, Sparkles } from "lucide-react";

interface SessionLockModalProps {
  onUnlock?: () => void;
}

export default function SessionLockScreen({ onUnlock }: SessionLockModalProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);

  const handleUnlockClick = () => {
    if (onUnlock) {
      onUnlock();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090D16] flex items-center justify-center p-4 antialiased font-sans">
      {/* LOCK CARD MODAL */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center space-y-6 relative">
        
        {/* TOP LOCK ICON */}
        <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-[#6B21A8]">
          <Lock className="w-5 h-5 stroke-[2.5]" />
        </div>

        {/* BRANDING */}
        <div className="flex items-center gap-1.5 text-[#6B21A8] font-bold text-xs tracking-wider uppercase">
          <Sparkles className="w-4 h-4 fill-current" />
          <span>Sparkle Eye Specialist</span>
        </div>

        {/* USER PROFILE INITS & DETAILS */}
        <div className="flex flex-col items-center space-y-3 w-full">
          {/* Avatar Initials Circle */}
          <div className="w-16 h-16 rounded-full border-2 border-purple-200 bg-purple-50 text-[#6B21A8] font-extrabold text-lg flex items-center justify-center shadow-xs">
            FA
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Folake Adeyemi
            </h2>
            <div className="mt-1 inline-block bg-slate-100 text-slate-600 font-semibold text-xs px-3 py-1 rounded-full border border-slate-200/60">
              Cashier — Billing Desk 2
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1.5">
              Last active: 2 minutes ago
            </p>
          </div>
        </div>

        {/* PIN INPUT SECTION */}
        <div className="w-full space-y-3 pt-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
            Enter Secure Admin PIN
          </label>

          {/* PIN Dots Indicator */}
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < 4;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    isFilled
                      ? "bg-[#0B132B] scale-100"
                      : "bg-slate-200 scale-90"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* UNLOCK BUTTON WITH BRAND COLOR #6B21A8 */}
        <div className="w-full pt-2">
          <button
            type="button"
            onClick={handleUnlockClick}
            className="w-full bg-[#6B21A8] hover:bg-[#581c87] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md hover:shadow-purple-900/20"
          >
            Unlock Workstation
          </button>
        </div>

        {/* SECONDARY ACTIONS */}
        <div className="flex items-center justify-center gap-4 text-xs font-semibold pt-1">
          <button type="button" className="text-[#6B21A8] hover:underline transition">
            Switch User
          </button>
          <span className="text-slate-300">|</span>
          <button type="button" className="text-[#6B21A8] hover:underline transition">
            Contact IT Support
          </button>
        </div>

        {/* FOOTER AUTO-LOCK NOTICE */}
        <p className="text-[10px] text-slate-400 font-medium pt-2">
          Session auto-locked after 5 minutes of inactivity
        </p>
      </div>
    </div>
  );
}