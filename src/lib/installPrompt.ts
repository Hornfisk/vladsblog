// PWA "Add to Home Screen" helper.
//
// `beforeinstallprompt` (Chromium: Android + desktop) can fire on initial page load,
// *before* the lazy-loaded /arcade route mounts — so we capture it globally at app
// startup and let the hook read/subscribe. iOS Safari never fires the event; the best
// it allows is a manual "Share → Add to Home Screen", which we surface as instructions.
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Wire global capture once, at app startup (see main.tsx). */
export function initInstallCapture(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // suppress Chrome's mini-infobar — we trigger from our own button
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ masquerades as macOS — distinguish by touch support
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iDevice || iPadOS;
}

export type InstallMode = "none" | "prompt" | "ios";

/**
 * `prompt` → a native install prompt is available (call promptInstall()).
 * `ios`    → iOS device with no install API → show Share instructions.
 * `none`   → already installed, or not installable on this browser.
 */
export function useInstallPrompt(): {
  mode: InstallMode;
  promptInstall: () => Promise<void>;
} {
  const [mode, setMode] = useState<InstallMode>("none");

  useEffect(() => {
    const sync = () => {
      if (isStandalone()) setMode("none");
      else if (deferred) setMode("prompt");
      else if (isIOS()) setMode("ios");
      else setMode("none");
    };
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* user dismissed / browser threw — nothing to do */
    }
    deferred = null;
    emit();
  };

  return { mode, promptInstall };
}
