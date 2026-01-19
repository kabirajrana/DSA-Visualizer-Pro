import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Index from "./pages/Index";
import Comparison from "./pages/Comparison";
import NotFound from "./pages/NotFound";
import {
  InstantAlgoPulsePreloader,
  LOADER_TIMING,
} from "@/components/InstantAlgoPulsePreloader";

// ✅ PWA install hook
import { usePWAInstall } from "./hooks/usePWAInstall";

const queryClient = new QueryClient();

// ✅ Branding
const BASE_TITLE = "Algovx – Interactive DSA Visualizer";
const BRAND_NAME = "Algovx";
const TAGLINE = "Visualize & Learn Algorithms";

const LOADER_TIMING_CONFIG = LOADER_TIMING;

// ✅ Key to remember dismiss choice
const INSTALL_DISMISS_KEY = "algovx_install_dismissed_until";

const TitleSync = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path === "/") {
      document.title = `${BASE_TITLE} | Visualize & Learn Algorithms`;
      return;
    }

    if (path === "/comparison") {
      document.title = `Comparison – ${BASE_TITLE}`;
      return;
    }

    document.title = `Not Found – ${BASE_TITLE}`;
  }, [location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

const AppShell = () => {
  const location = useLocation();
  const firstPathRef = useRef<string | null>(null);

  const [runId, setRunId] = useState(0);
  const [showPreloader, setShowPreloader] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // ✅ PWA install
  const { canInstall, installApp } = usePWAInstall();

  // ✅ Show popup once (and allow dismiss)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // ✅ Detect iOS for manual install tip
  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  const dismissInstall = (days = 7) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(INSTALL_DISMISS_KEY, String(until));
    setShowInstallPrompt(false);
  };

  // ✅ Show install suggestion only once (after a small delay)
  useEffect(() => {
    if (!canInstall) return;

    const dismissedUntil = Number(
      localStorage.getItem(INSTALL_DISMISS_KEY) || "0"
    );
    if (Date.now() < dismissedUntil) return;

    const t = window.setTimeout(() => setShowInstallPrompt(true), 2500);
    return () => window.clearTimeout(t);
  }, [canInstall]);

  // Mark the app as "ready" after the route has painted at least once.
  useEffect(() => {
    setAppReady(false);
    const raf = window.requestAnimationFrame(() => setAppReady(true));
    return () => window.cancelAnimationFrame(raf);
  }, [location.pathname]);

  // First load: show once.
  // Route transitions: replay on pathname changes.
  useEffect(() => {
    if (firstPathRef.current == null) {
      firstPathRef.current = location.pathname;
      return;
    }

    if (firstPathRef.current === location.pathname) return;
    firstPathRef.current = location.pathname;

    setRunId((n) => n + 1);
    setShowPreloader(true);
  }, [location.pathname]);

  return (
    <>
      <TitleSync />

      {/* ✅ Install suggestion UI (one-time popup + dismiss) */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 360,
        }}
      >
        {showInstallPrompt && canInstall && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(11, 18, 32, 0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                Install Algovx?
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Get a faster, app-like experience on your home screen.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => dismissInstall(7)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "transparent",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.18)",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Not now
              </button>

              <button
                onClick={async () => {
                  await installApp();
                  // If user cancels the browser prompt, avoid re-showing today
                  dismissInstall(1);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Install
              </button>
            </div>
          </div>
        )}

        {/* iPhone Safari does not support the install prompt API */}
        {!canInstall && isIOS && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(11, 18, 32, 0.92)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 13,
              lineHeight: 1.35,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            📌 Install on iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>
          </div>
        )}
      </div>

      <InstantAlgoPulsePreloader
        key={runId}
        show={showPreloader}
        brand={BRAND_NAME}
        subtitle={TAGLINE}
        appReady={appReady}
        timing={LOADER_TIMING_CONFIG}
        onFinished={() => {
          window.requestAnimationFrame(() => setShowPreloader(false));
        }}
      />

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/comparison" element={<Comparison />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};
