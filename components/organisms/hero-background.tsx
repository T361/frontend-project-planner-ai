"use client";

import { useEffect, useRef } from "react";

/**
 * Organism: a premium "data field" — drifting particles connected by faint blue
 * lines, layered over flowing wave rows. One canvas, capped DPR + particle count,
 * pauses entirely under prefers-reduced-motion. Inspired by Nvidia/Palantir hero
 * fields but kept cheap.
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

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let particles: P[] = [];

    const seed = () => {
      const count = Math.min(90, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6,
      }));
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    resize();
    window.addEventListener("resize", resize);

    const LINK = 130;

    const drawWaves = (t: number) => {
      for (let li = 0; li < 3; li++) {
        const baseY = h * 0.62 + li * 40;
        const phase = t * 0.0005 + li * 0.9;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y =
            baseY +
            Math.sin(x * 0.011 + phase) * 16 +
            Math.sin(x * 0.026 + phase * 1.6) * 7;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(59,130,246,${0.06 + (3 - li) * 0.03})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      drawWaves(t);

      // Move + draw particles.
      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(96,165,250,0.7)";
        ctx.fill();
      }

      // Connect nearby particles.
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const alpha = (1 - Math.sqrt(d2) / LINK) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
    };

    if (reduce) {
      frame(0);
    } else {
      const loop = (t: number) => {
        frame(t);
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
      {/* Animated aurora glow behind the particle field. */}
      <div
        className="aurora"
        style={{
          top: "-10%",
          left: "20%",
          width: "42vw",
          height: "42vw",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.55), transparent 60%)",
          animation: "aurora-drift 18s ease-in-out infinite",
        }}
      />
      <div
        className="aurora"
        style={{
          top: "5%",
          right: "10%",
          width: "34vw",
          height: "34vw",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.45), transparent 60%)",
          animation: "aurora-drift-2 22s ease-in-out infinite",
        }}
      />
      <canvas ref={ref} className="relative h-full w-full opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background" />
    </div>
  );
}
