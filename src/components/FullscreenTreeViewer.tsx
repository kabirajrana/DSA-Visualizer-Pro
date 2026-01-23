import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Maximize2, Minimize2, Minus, Plus, RefreshCcw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type Transform = {
  x: number;
  y: number;
  scale: number;
};

export type FullscreenTreeViewerApi = {
  getSvgElement: () => SVGSVGElement | null;
  getFitViewBox: (padding?: number) => string;
  getCurrentViewBox: () => string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  headerCenter?: React.ReactNode;
  toolbarExtras?: React.ReactNode;
  overlay?: React.ReactNode;
  bounds: Bounds;
  minScale?: number;
  maxScale?: number;
  fitPadding?: number;
  sceneClassName?: string;
  interactionDisabled?: boolean;
  apiRef?: React.Ref<FullscreenTreeViewerApi>;
  children: React.ReactNode;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cr = entry.contentRect;
      setSize({ width: cr.width, height: cr.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

function getFitTransform(bounds: Bounds, viewportW: number, viewportH: number, padding: number, minScale: number, maxScale: number): Transform {
  const bw = Math.max(1, bounds.maxX - bounds.minX);
  const bh = Math.max(1, bounds.maxY - bounds.minY);

  const targetW = Math.max(1, viewportW - padding * 2);
  const targetH = Math.max(1, viewportH - padding * 2);

  const scale = clamp(Math.min(targetW / bw, targetH / bh), minScale, maxScale);

  const x = (viewportW - bw * scale) / 2 - bounds.minX * scale;
  const y = (viewportH - bh * scale) / 2 - bounds.minY * scale;

  return { x, y, scale };
}

function getCenteredTransform(bounds: Bounds, viewportW: number, viewportH: number, scale: number): Transform {
  const bw = Math.max(1, bounds.maxX - bounds.minX);
  const bh = Math.max(1, bounds.maxY - bounds.minY);

  const x = (viewportW - bw * scale) / 2 - bounds.minX * scale;
  const y = (viewportH - bh * scale) / 2 - bounds.minY * scale;

  return { x, y, scale };
}

export const FullscreenTreeViewer: React.FC<Props> = ({
  open,
  onOpenChange,
  title = 'Merge Sort Tree',
  subtitle = 'Pan/zoom to explore',
  headerCenter,
  toolbarExtras,
  overlay,
  bounds,
  minScale = 0.4,
  maxScale = 2.5,
  fitPadding = 48,
  sceneClassName,
  interactionDisabled = false,
  apiRef,
  children,
}) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const { ref: viewportRef, size } = useElementSize<HTMLDivElement>();
  const [t, setT] = React.useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isBrowserFullscreen, setIsBrowserFullscreen] = React.useState(false);

  const isSvgChild = React.useMemo(() => {
    return React.isValidElement(children) && typeof children.type === 'string' && children.type.toLowerCase() === 'svg';
  }, [children]);

  React.useImperativeHandle(
    apiRef,
    (): FullscreenTreeViewerApi => ({
      getSvgElement: () => {
        const root = viewportRef.current;
        if (!root) return null;
        return (root.querySelector('svg') as SVGSVGElement | null) ?? null;
      },
      getFitViewBox: (padding?: number) => {
        const pad = padding ?? fitPadding;
        const bw = Math.max(1, bounds.maxX - bounds.minX);
        const bh = Math.max(1, bounds.maxY - bounds.minY);
        const x = bounds.minX - pad;
        const y = bounds.minY - pad;
        const w = bw + pad * 2;
        const h = bh + pad * 2;
        return `${x} ${y} ${w} ${h}`;
      },
      getCurrentViewBox: () => {
        const svg = (viewportRef.current?.querySelector('svg') as SVGSVGElement | null) ?? null;
        if (!svg) return null;
        return svg.getAttribute('viewBox');
      },
    }),
    [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, fitPadding, viewportRef],
  );

  const canUseSvgViewBox = isSvgChild && open && size.width > 0 && size.height > 0;

  const viewBox = React.useMemo(() => {
    if (!canUseSvgViewBox) return undefined;
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    const s = Math.max(0.0001, t.scale);

    const vbW = w / s;
    const vbH = h / s;

    // Convert CSS-transform-style translation into camera viewBox coordinates.
    let x = -t.x / s;
    let y = -t.y / s;

    // Clamp to keep content within reach and prevent blank view.
    const pad = fitPadding;
    const minX = bounds.minX - pad;
    const maxX = bounds.maxX + pad - vbW;
    const minY = bounds.minY - pad;
    const maxY = bounds.maxY + pad - vbH;
    if (Number.isFinite(minX) && Number.isFinite(maxX) && maxX >= minX) x = clamp(x, minX, maxX);
    if (Number.isFinite(minY) && Number.isFinite(maxY) && maxY >= minY) y = clamp(y, minY, maxY);

    // Snap camera pan to whole units for maximum sharpness.
    x = Number.isFinite(x) ? Math.round(x) : 0;
    y = Number.isFinite(y) ? Math.round(y) : 0;

    // Keep a stable string to avoid unnecessary rerenders.
    const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();
    return `${fmt(x)} ${fmt(y)} ${fmt(vbW)} ${fmt(vbH)}`;
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, canUseSvgViewBox, fitPadding, size.height, size.width, t.scale, t.x, t.y]);

  const panRef = React.useRef<{
    isPanning: boolean;
    pointerId: number | null;
    lastX: number;
    lastY: number;
  }>({ isPanning: false, pointerId: null, lastX: 0, lastY: 0 });

  const applyFit = React.useCallback(() => {
    if (!size.width || !size.height) return;
    setT(getFitTransform(bounds, size.width, size.height, fitPadding, minScale, maxScale));
  }, [bounds, fitPadding, maxScale, minScale, size.height, size.width]);

  const applyReset = React.useCallback(() => {
    if (!size.width || !size.height) return;
    setT(getCenteredTransform(bounds, size.width, size.height, 1));
  }, [bounds, size.height, size.width]);

  // "Reset View" should be reliable and useful: fit-to-bounds.
  const resetView = React.useCallback(() => {
    if (!size.width || !size.height) {
      const id = requestAnimationFrame(() => applyFit());
      return () => cancelAnimationFrame(id);
    }
    applyFit();
    return undefined;
  }, [applyFit, size.height, size.width]);

  // Reset zoom/pan when the modal closes (ESC, X, or outside click).
  React.useEffect(() => {
    if (open) return;
    setT({ x: 0, y: 0, scale: 1 });
  }, [open]);

  // Keyboard shortcut: R = Reset View
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (target as HTMLElement | null)?.isContentEditable) return;
      e.preventDefault();
      resetView();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, resetView]);

  React.useEffect(() => {
    if (!open) return;
    // Wait a frame so the dialog content measures correctly.
    const id = requestAnimationFrame(() => applyFit());
    return () => cancelAnimationFrame(id);
  }, [open, applyFit]);

  const zoomAtPoint = React.useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      setT((prev) => {
        const s = prev.scale;
        const worldX = (px - prev.x) / s;
        const worldY = (py - prev.y) / s;
        const ns = clamp(nextScale, minScale, maxScale);
        return {
          scale: ns,
          x: px - worldX * ns,
          y: py - worldY * ns,
        };
      });
    },
    [maxScale, minScale, viewportRef],
  );

  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      if (interactionDisabled) return;
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      const factor = direction > 0 ? 1.06 : 0.94;
      zoomAtPoint(e.clientX, e.clientY, t.scale * factor);
    },
    [interactionDisabled, t.scale, zoomAtPoint],
  );

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    if (interactionDisabled) return;
    const el = viewportRef.current;
    if (!el) return;

    panRef.current.isPanning = true;
    panRef.current.pointerId = e.pointerId;
    panRef.current.lastX = e.clientX;
    panRef.current.lastY = e.clientY;

    el.setPointerCapture(e.pointerId);
  }, [interactionDisabled, viewportRef]);

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (interactionDisabled) return;
    if (!panRef.current.isPanning) return;
    if (panRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - panRef.current.lastX;
    const dy = e.clientY - panRef.current.lastY;

    panRef.current.lastX = e.clientX;
    panRef.current.lastY = e.clientY;

    setT((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, [interactionDisabled]);

  const onPointerUp = React.useCallback((e: React.PointerEvent) => {
    if (interactionDisabled) return;
    if (panRef.current.pointerId !== e.pointerId) return;

    panRef.current.isPanning = false;
    panRef.current.pointerId = null;

    const el = viewportRef.current;
    if (!el) return;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, [interactionDisabled, viewportRef]);

  const zoomIn = React.useCallback(() => {
    setT((prev) => ({ ...prev, scale: clamp(prev.scale * 1.15, minScale, maxScale) }));
  }, [maxScale, minScale]);

  const zoomOut = React.useCallback(() => {
    setT((prev) => ({ ...prev, scale: clamp(prev.scale / 1.15, minScale, maxScale) }));
  }, [maxScale, minScale]);

  const updateFullscreenState = React.useCallback(() => {
    const el = contentRef.current;
    if (!el) {
      setIsBrowserFullscreen(false);
      return;
    }
    setIsBrowserFullscreen(document.fullscreenElement === el);
  }, []);

  React.useEffect(() => {
    document.addEventListener('fullscreenchange', updateFullscreenState);
    updateFullscreenState();
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, [updateFullscreenState]);

  const toggleBrowserFullscreen = React.useCallback(async () => {
    const el = contentRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // ignore (browser may block fullscreen)
    }
  }, []);

  // If the dialog closes while we're in browser fullscreen, exit fullscreen.
  React.useEffect(() => {
    if (open) return;
    const el = contentRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      void document.exitFullscreen();
    }
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          ref={contentRef}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(1200px,calc(100vw-1.5rem))] h-[min(860px,calc(100vh-1.5rem))] -translate-x-1/2 -translate-y-1/2',
            'rounded-2xl border border-border bg-[#070B12] shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'overflow-hidden',
          )}
        >
          <div className="flex h-full w-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{title}</div>
                <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
              </div>

              {headerCenter && (
                <div className="hidden md:flex flex-1 items-center justify-center">
                  {headerCenter}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {toolbarExtras}
                <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card/50 p-1">
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={zoomOut} aria-label="Zoom out">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={zoomIn} aria-label="Zoom in">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={resetView} aria-label="Reset view">
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-10 w-10', isBrowserFullscreen && 'bg-muted')}
                    onClick={() => void toggleBrowserFullscreen()}
                    aria-label={isBrowserFullscreen ? 'Exit browser fullscreen' : 'Enter browser fullscreen'}
                  >
                    {isBrowserFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="hidden sm:block shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {Math.round(t.scale * 100)}%
                </div>

                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Close">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogPrimitive.Close>
              </div>
            </div>

            {headerCenter && (
              <div className="md:hidden border-b border-border px-4 py-2">
                <div className="flex items-center justify-center">{headerCenter}</div>
              </div>
            )}

            <div className="relative flex-1 bg-gradient-to-b from-[#070B12] to-[#0B1220]">
              <div
                ref={viewportRef}
                className={cn(
                  'absolute inset-0 overflow-hidden',
                  'cursor-grab active:cursor-grabbing',
                  'touch-none',
                )}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {canUseSvgViewBox && viewBox ? (
                  React.cloneElement(children as React.ReactElement, {
                    width: '100%',
                    height: '100%',
                    viewBox,
                    preserveAspectRatio: 'xMinYMin meet',
                    style: {
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      ...(children as React.ReactElement).props?.style,
                    },
                  })
                ) : (
                  <div
                    className={cn('absolute left-0 top-0 will-change-transform', sceneClassName)}
                    style={{
                      transform: `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0) scale(${t.scale})`,
                      transformOrigin: '0 0',
                    }}
                  >
                    {children}
                  </div>
                )}
              </div>

              {overlay && (
                <div className="absolute inset-0 pointer-events-none">
                  {overlay}
                </div>
              )}

              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-[11px] text-muted-foreground shadow-sm">
                <span className="pointer-events-none">Drag to pan</span>
                <span className="opacity-40">•</span>
                <span className="pointer-events-none">Scroll to zoom</span>
              </div>

              <div className="sm:hidden absolute bottom-3 right-3 flex items-center gap-2 rounded-xl border border-border bg-background/80 p-1 shadow-sm">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={zoomOut} aria-label="Zoom out">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={zoomIn} aria-label="Zoom in">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={resetView} aria-label="Reset view">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-9 w-9', isBrowserFullscreen && 'bg-muted')}
                  onClick={() => void toggleBrowserFullscreen()}
                  aria-label={isBrowserFullscreen ? 'Exit browser fullscreen' : 'Enter browser fullscreen'}
                >
                  {isBrowserFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
