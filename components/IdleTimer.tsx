"use client";

import React, { useState, useEffect, useCallback } from "react";
import SessionLockScreen from "@/components/SessionLockModal";

interface IdleTimerProps {
  children: React.ReactNode;
  timeoutMinutes?: number; // Default: 5 minutes
}

export default function IdleTimer({
  children,
  timeoutMinutes = 5,
}: IdleTimerProps) {
  const [isLocked, setIsLocked] = useState(false);

  const timeoutMs = timeoutMinutes * 60 * 1000;

  const resetTimer = useCallback(() => {
    // If screen is already locked, don't auto-unlock on movement
    if (isLocked) return;

    // Reset inactivity timer
    if ((window as any).idleTimer) {
      clearTimeout((window as any).idleTimer);
    }

    (window as any).idleTimer = setTimeout(() => {
      setIsLocked(true);
    }, timeoutMs);
  }, [isLocked, timeoutMs]);

  useEffect(() => {
    // Listen to common user activity events
    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Start initial timer on mount
    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if ((window as any).idleTimer) {
        clearTimeout((window as any).idleTimer);
      }
    };
  }, [resetTimer]);

  const handleUnlock = () => {
    setIsLocked(false);
    resetTimer();
  };

  return (
    <>
      {children}
      {isLocked && <SessionLockScreen onUnlock={handleUnlock} />}
    </>
  );
}