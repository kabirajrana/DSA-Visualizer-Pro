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

const queryClient = new QueryClient();

const BASE_TITLE = "DSA Visualizer – Interactive Algorithm Learning";
const BRAND_NAME = "DSA Visualizer";
const TAGLINE = "Visual Algorithm Learning";

const LOADER_TIMING_CONFIG = LOADER_TIMING;

const TitleSync = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path === "/") {
      document.title = BASE_TITLE;
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
