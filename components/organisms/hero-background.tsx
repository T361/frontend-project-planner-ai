"use client";

import { useEffect, useRef } from "react";

/**
 * Organism: low-cost animated "data terrain" — horizontal blue waves of moving
 * dots rendered on a single canvas. Honors prefers-reduced-motion (renders one
 * static frame) and caps device pixel ratio so it stays cheap on mobile.
 */
export function HeroBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const LINES = 5;
    const SPACING = 26; // px between dots
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / SPACING) + 1;
      for (let li = 0; li < LINES; li++) {
        const baseY = h * 0.45 + li * 34;
        const phase = t * 0.0006 + li * 0.8;
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING;
          const y =
            baseY +
            Math.sin(x * 0.012 + phase) * 18 +
            Math.sin(x * 0.03 + phase * 1.7) * 8;
          const depth = 1 - li / LINES;
          const r = 1.1 + depth * 1.3;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(59,130,246,${0.10 + depth * 0.45})`;
          ctx.fill();
        }
      }
    };

    if (reduce) {
      draw(0);
    } else {
      const loop = (t: number) => {
        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={ref} className="h-full w-full opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
