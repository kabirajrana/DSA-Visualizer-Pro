import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Index from "./pages/Index";
import Comparison from "./pages/Comparison";
import NotFound from "./pages/NotFound";
import SEO from "@/components/SEO";
import {
  InstantAlgoPulsePreloader,
  LOADER_TIMING,
} from "@/components/InstantAlgoPulsePreloader";

import { usePWAInstall } from "./hooks/usePWAInstall";

const queryClient = new QueryClient();

const BRAND_NAME = "Algovx";
const TAGLINE = "Visualize & Learn Algorithms";

const LOADER_TIMING_CONFIG = LOADER_TIMING;

const INSTALL_SESSION_KEY = "algovx_install_prompt_dismissed_session";

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

  // ✅ Show prompt (per visit/session)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // ✅ Detect iOS for manual install tip
  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  // ✅ Dismiss only for THIS SESSION (shows again next visit)
  const dismissForThisVisit = () => {
    sessionStorage.setItem(INSTALL_SESSION_KEY, "1");
    setShowInstallPrompt(false);
  };

  // ✅ Show install suggestion on EVERY VISIT (unless dismissed this session)
  useEffect(() => {
    if (!canInstall) return;

    const dismissedThisSession =
      sessionStorage.getItem(INSTALL_SESSION_KEY) === "1";
    if (dismissedThisSession) return;

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
      {/* ✅ Install suggestion UI (shows every visit, dismiss hides only for this session) */}
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
                onClick={dismissForThisVisit}
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
                  // Hide after they interact; next visit it will show again if not installed.
                  dismissForThisVisit();
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
        <Route
          path="/"
          element={
            <>
              <SEO
                title="Algovx – Interactive DSA Visualizer | Kabiraj Rana (AI Student)"
                description="Algovx is an interactive DSA visualizer built by Kabiraj Rana (AI & ML student). Learn sorting and searching algorithms with smooth animations and step-by-step execution."
                canonicalPath="/"
                ogImage="/og.png"
              />
              <Index />
            </>
          }
        />
        <Route
          path="/comparison"
          element={
            <>
              <SEO
                title="Compare Sorting Algorithms Visually | Algovx"
                description="Compare sorting algorithms visually and understand performance, swaps, and comparisons. Built for students using Algovx."
                canonicalPath="/comparison"
                ogImage="/og.png"
              />
              <Comparison />
            </>
          }
        />
        <Route
          path="*"
          element={
            <>
              <SEO
                title="Page Not Found | Algovx"
                noindex
                canonicalPath={location.pathname}
                ogImage="/og.png"
              />
              <NotFound />
            </>
          }
        />
      </Routes>
    </>
  );
};
