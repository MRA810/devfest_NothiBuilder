import { useEffect, useRef } from "react";

// A wave of little pixel squares sweeps across the screen every so often.
const CELL = 26; // pixel size (px)
const FIRST = 4000; // wait before the first wave (ms)
const EVERY = 10000; // pause between waves (ms)
const DUR = 3400; // how long one sweep takes (ms)
const COLORS = ["#39ff14", "#ffffff", "#12b3bd", "#8bf5d0"];

export default function PixelWave({ fixed = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    let W = 0,
      H = 0,
      raf = 0,
      timer = 0,
      dead = false;

    const size = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      cv.width = W * d;
      cv.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const run = () => {
      if (dead) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const t0 = performance.now();
      const frame = (now) => {
        const p = (now - t0) / DUR;
        ctx.clearRect(0, 0, W, H);
        if (dead) return;
        if (p >= 1) {
          timer = setTimeout(run, EVERY);
          return;
        }
        const band = Math.max(160, W * 0.16);
        const front = -band + p * (W + band * 2);
        const cols = Math.ceil(W / CELL),
          rows = Math.ceil(H / CELL);
        for (let r = 0; r < rows; r++) {
          const wob = Math.sin(r * 0.38 + p * 9) * band * 0.45;
          for (let c = 0; c < cols; c++) {
            const x = c * CELL,
              y = r * CELL;
            const d = Math.abs((dir > 0 ? x : W - x) - (front + wob));
            if (d > band) continue;
            let k = 1 - d / band;
            k = k * k * (3 - 2 * k);
            const h = ((r * 73856093) ^ (c * 19349663)) >>> 0;
            if (h % 7 === 0 && k < 0.35) continue; // ragged, dissolving edge
            const s = (CELL - 3) * (0.35 + 0.65 * k);
            ctx.globalAlpha = k * 0.75;
            ctx.fillStyle =
              h % 13 === 0 ? "#ff7a1a" : COLORS[h % COLORS.length];
            ctx.fillRect(x + (CELL - s) / 2, y + (CELL - s) / 2, s, s);
          }
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    timer = setTimeout(run, FIRST);

    return () => {
      dead = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={"pixwave" + (fixed ? " fixed" : "")}
      aria-hidden="true"
    />
  );
}
