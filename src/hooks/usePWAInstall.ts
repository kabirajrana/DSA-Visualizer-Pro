import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setPromptEvent(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const installApp = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  return {
    canInstall: !!promptEvent && !isInstalled,
    installApp,
  };
}
