import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Index from "./pages/Index";
import Comparison from "./pages/Comparison";
import NotFound from "./pages/NotFound";
import { InstantAlgoPulsePreloader, LOADER_TIMING } from "@/components/InstantAlgoPulsePreloader";

// ✅ NEW: import the PWA install hook
import { usePWAInstall } from "./hooks/usePWAInstall";

const queryClient = new QueryClient();

// ✅ Updated branding (matches your domain + SEO)
const BASE_TITLE = "Algovx – Interactive DSA Visualizer";
const BRAND_NAME = "Algovx";
const TAGLINE = "Visualize & Learn Algorithms";

const LOADER_TIMING_CONFIG = LOADER_TIMING;

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

  // ✅ NEW: PWA install
  const { canInstall, installApp } = usePWAInstall();

  // ✅ Optional: detect iOS for "Add to Home Screen" tip
  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

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

      {/* ✅ Install suggestion UI */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 320,
        }}
      >
        {canInstall && (
          <button
            onClick={installApp}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#2563eb",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            📲 Install Algovx App
          </button>
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
          // Allow the next frame to paint the new route before fading out.
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
