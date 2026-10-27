"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import SessionLockScreen from "@/components/SessionLockModal";

interface IdleTimerProps {
  children: React.ReactNode;
  timeoutMinutes?: number;
}

export default function IdleTimer({
  children,
  timeoutMinutes = 5,
}: IdleTimerProps) {
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const resetTimer = useCallback(() => {
    if (isLocked) return;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, timeoutMs);
  }, [isLocked, timeoutMs]);

  useEffect(() => {
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
  }, [resetTimer]);

  const handleUnlock = () => {
    setIsLocked(false);
  };

  return (
    <>
      {children}
      {isLocked && <SessionLockScreen onUnlock={handleUnlock} />}
    </>
  );
}
