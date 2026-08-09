"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  active: boolean;
  color?: string;
  bars?: number;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Fake-but-convincing equalizer bars driven by requestAnimationFrame.
 * Amplitude eases toward full while speech plays and settles to a faint
 * idle shimmer when it stops.
 */
export default function Waveform({
  active,
  color = "#F59E0B",
  bars = 26,
  width = 260,
  height = 44,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  const colorRef = useRef(color);

  useEffect(() => {
    activeRef.current = active;
    colorRef.current = color;
  }, [active, color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let level = 0;

    const draw = (now: number) => {
      const t = now / 1000;
      const target = activeRef.current ? 1 : 0.05;
      level += (target - level) * 0.07;

      ctx.clearRect(0, 0, width, height);
      const gap = 3;
      const barWidth = (width - gap * (bars - 1)) / bars;
      ctx.fillStyle = colorRef.current;

      for (let i = 0; i < bars; i++) {
        const envelope = 0.3 + 0.7 * Math.sin((Math.PI * i) / (bars - 1));
        const wobble =
          0.55 +
          0.45 *
            Math.sin(t * (2.1 + (i % 5) * 0.9) + i * 0.9) *
            Math.sin(t * 3.7 + i * 2.3);
        const barHeight = Math.max(2.5, height * envelope * wobble * level);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        ctx.globalAlpha = 0.35 + 0.65 * (barHeight / height);
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bars, width, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width, height }}
    />
  );
}
