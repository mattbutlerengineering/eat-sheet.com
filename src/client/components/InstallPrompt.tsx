import { useState, useEffect, useCallback, useRef } from "react";
import { Monster } from "./Monster";

const DISMISSED_KEY = "eat-sheet-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    const { outcome } = await prompt.prompt();
    deferredPrompt.current = null;
    setVisible(false);

    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "installed");
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    deferredPrompt.current = null;
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="bg-stone-800 border-b border-stone-700 px-4 py-3 flex items-center gap-3 animate-slide-down"
      role="banner"
      aria-label="Install app prompt"
    >
      <Monster variant="party" size={32} />
      <p className="text-stone-200 text-sm flex-1">
        Add <span className="font-bold text-coral-500">Eat Sheet</span> to
        your home screen!
      </p>
      <button
        onClick={handleInstall}
        className="bg-coral-500 text-white text-sm font-bold px-3 py-1 rounded-lg hover:bg-coral-600 active:scale-95 transition-all"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="text-stone-500 hover:text-stone-300 transition-colors p-1"
        aria-label="Dismiss install prompt"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
