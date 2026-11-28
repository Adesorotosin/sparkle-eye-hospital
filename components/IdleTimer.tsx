"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import SessionLockScreen from "@/components/SessionLockModal";

interface IdleTimerProps {
  children: React.ReactNode;
  timeoutMinutes?: number;
}

export default function IdleTimer({
  children,
  timeoutMinutes = 5,
}: IdleTimerProps) {
  const pathname = usePathname();
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const timeoutMs = timeoutMinutes * 60 * 1000;

  // The idle lock belongs to an authenticated workstation, not the public
  // sign-in or password-reset screens. Recheck after navigation so a fresh
  // login starts the timer and signing out stops it.
  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => {
        if (active) setIsAuthenticated(response.ok);
      })
      .catch(() => {
        // Keep the current state on transient network errors. The server still
        // protects every authenticated route independently.
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  const resetTimer = useCallback(() => {
    if (isLocked || !isAuthenticated) return;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    lastActivityAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      setLastActiveAt(lastActivityAtRef.current);
      setIsLocked(true);
    }, timeoutMs);
  }, [isAuthenticated, isLocked, timeoutMs]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ] as const;

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, resetTimer]);

  const handleUnlock = () => {
    setIsLocked(false);
    setLastActiveAt(null);
  };

  return (
    <>
      {children}
      {isLocked && (
        <SessionLockScreen
          onUnlock={handleUnlock}
          lastActiveAt={lastActiveAt}
          timeoutMinutes={timeoutMinutes}
        />
      )}
    </>
  );
}
